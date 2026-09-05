import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { chmod, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'

type TauriConfig = {
	version: string
}

const execFileAsync = promisify(execFile)

// Comme execFileAsync mais ignore stderr (utile pour tar.exe sur Windows qui émet
// des milliers de warnings "Can't restore time" inoffensifs et exit code 1).
const execIgnoreStderr = (cmd: string, args: string[], options: Record<string, unknown> = {}, allowedCodes: number[] = []) => {
	return new Promise<void>((resolveExec, rejectExec) => {
		const child = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'ignore'] })
		let stdout = ''
		if (child.stdout) child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
		child.on('error', rejectExec)
		child.on('close', (code) => {
			if (code === 0 || allowedCodes.includes(code ?? -1)) resolveExec()
			else rejectExec(new Error(`${cmd} exited with code ${code}\n${stdout}`))
		})
	})
}
const nodeVersion = '22.23.2'
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tauriConfig = JSON.parse(await readFile(join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf8')) as TauriConfig
const cacheDir = join(rootDir, '.cache', 'tauri')
const runtimeDir = join(rootDir, 'src-tauri', 'runtime')
const appDir = join(runtimeDir, 'app')

const isWindows = process.platform === 'win32'
const nodeArchive = isWindows
	? `node-v${nodeVersion}-win-x64.zip`
	: `node-v${nodeVersion}-linux-x64.tar.xz`
const archivePath = join(cacheDir, nodeArchive)
const extractedDir = join(cacheDir, isWindows ? `node-v${nodeVersion}-win-x64` : `node-v${nodeVersion}-linux-x64`)

const download = async (url: string, destination: string) => {
	const response = await fetch(url)
	if (!response.ok || !response.body) throw new Error(`Unable to download ${url}: ${response.status}`)
	await writeFile(destination, Buffer.from(await response.arrayBuffer()))
}

const sha256 = async (filePath: string) => {
	const hash = createHash('sha256')
	for await (const chunk of createReadStream(filePath)) hash.update(chunk)
	return hash.digest('hex')
}

const prepareNode = async () => {
	await mkdir(cacheDir, { recursive: true })
	const baseUrl = `https://nodejs.org/dist/v${nodeVersion}`
	const checksumsPath = join(cacheDir, `SHASUMS256-v${nodeVersion}.txt`)
	await download(`${baseUrl}/SHASUMS256.txt`, checksumsPath)
	const checksums = await readFile(checksumsPath, 'utf8')
	const expectedChecksum = checksums.split('\n').find(line => line.endsWith(`  ${nodeArchive}`))?.split(/\s+/)[0]
	if (!expectedChecksum) throw new Error(`Checksum not found for ${nodeArchive}`)
	try {
		if (await sha256(archivePath) !== expectedChecksum) await download(`${baseUrl}/${nodeArchive}`, archivePath)
	} catch {
		await download(`${baseUrl}/${nodeArchive}`, archivePath)
	}
	if (await sha256(archivePath) !== expectedChecksum) throw new Error(`Invalid checksum for ${nodeArchive}`)
	await rm(extractedDir, { recursive: true, force: true })
	if (isWindows) {
		// tar.exe émet des warnings "Can't restore time" sur Windows (inoffensifs) qui remplissent stderr.
		// On ignore stderr pour éviter ERR_CHILD_PROCESS_STDIO_MAXBUFFER.
		await execIgnoreStderr('tar', ['-xf', archivePath, '-C', cacheDir], {}, [1])
		await mkdir(join(runtimeDir, 'node', 'bin'), { recursive: true })
		await cp(join(extractedDir, 'node.exe'), join(runtimeDir, 'node', 'bin', 'node.exe'))
		await cp(join(extractedDir, 'LICENSE'), join(runtimeDir, 'node', 'LICENSE'))
		// Nettoyer l'extraction (95 MB) — seul node.exe et LICENSE sont nécessaires dans le runtime
		await rm(extractedDir, { recursive: true, force: true })
	} else {
		await execFileAsync('tar', ['-xJf', archivePath, '-C', cacheDir])
		await mkdir(join(runtimeDir, 'node', 'bin'), { recursive: true })
		const nodePath = join(runtimeDir, 'node', 'bin', 'node')
		await cp(join(extractedDir, 'bin', 'node'), nodePath)
		await execFileAsync('strip', ['--strip-unneeded', nodePath])
		await chmod(nodePath, 0o755)
		await cp(join(extractedDir, 'LICENSE'), join(runtimeDir, 'node', 'LICENSE'))
	}
}

const preparePostgres = async () => {
	if (!isWindows) return
	// PostgreSQL portable pour Windows.
	// Le zip est cherché en priorité dans vendor/ (gitignored), puis dans .cache/tauri/.
	// Si absent ou incomplet (< 100 MB), on le télécharge dans .cache/tauri/.
	const pgUrl = 'https://get.enterprisedb.com/postgresql/postgresql-16.15-3-windows-x64-binaries.zip'
	const vendorArchivePath = join(rootDir, 'vendor', 'pg-windows.zip')
	const cacheArchivePath = join(cacheDir, 'pg-windows.zip')
	const pgInstallDir = join(runtimeDir, 'app', 'postgres', 'install')
	const pgArchivePath = (await fileExists(vendorArchivePath)) ? vendorArchivePath : cacheArchivePath
	// Vérifier que le zip existe ET a une taille plausible (> 100 MB) pour éviter un téléchargement partiel
	const pgArchiveSize = await fileExists(pgArchivePath) ? (await readFile(pgArchivePath)).length : 0
	if (pgArchiveSize < 100 * 1024 * 1024) {
		await mkdir(cacheDir, { recursive: true })
		// Invoke-WebRequest gère les redirects et le streaming nativement sur Windows
		await execFileAsync('powershell', [
			'-NoProfile', '-Command',
			`Invoke-WebRequest -Uri '${pgUrl}' -OutFile '${cacheArchivePath}' -UseBasicParsing`,
		])
	}
	// Extraire directement dans le runtime pour éviter de dupliquer ~800 MB sur disque.
	// L'archive extrait un dossier pgsql/ — on extrait dans un temp puis déplace seulement bin/lib/share.
	await rm(pgInstallDir, { recursive: true, force: true })
	await mkdir(pgInstallDir, { recursive: true })
	// Extraire seulement bin/, lib/, share/ de l'archive (ignore docs/, include/, pgAdmin/)
	await execIgnoreStderr('tar', ['-xf', pgArchivePath, '-C', pgInstallDir, '--strip-components=1', 'pgsql/bin', 'pgsql/lib', 'pgsql/share'], {}, [1])
}

const fileExists = async (path: string): Promise<boolean> => {
	try {
		await readFile(path)
		return true
	} catch {
		return false
	}
}

const prepareApp = async () => {
	await cp(join(rootDir, '.output'), join(appDir, '.output'), { recursive: true, dereference: true })
	await cp(join(rootDir, 'src-tauri', 'server-start.mjs'), join(appDir, 'server-start.mjs'))
	await cp(join(rootDir, 'scripts'), join(appDir, 'scripts'), { recursive: true })
	await cp(join(rootDir, 'pnltracker-tools'), join(appDir, 'pnltracker-tools'), { recursive: true })
	await rm(join(appDir, 'pnltracker-tools', 'python', '.venv'), { recursive: true, force: true })
	await cp(join(rootDir, 'prisma', 'auth', 'migrations'), join(appDir, 'prisma', 'auth', 'migrations'), { recursive: true })
	await mkdir(join(appDir, 'prisma-engine'), { recursive: true })
	const prismaEngineName = isWindows
		? 'query_engine-windows.dll.node'
		: 'libquery_engine-debian-openssl-3.0.x.so.node'
	await cp(
		join(rootDir, 'generated', 'prisma-auth', prismaEngineName),
		join(appDir, 'prisma-engine', prismaEngineName),
	)
	// Windows: avec nitro externals trace:false, les imports dans .output/server utilisent
	// des chemins absolus (file:///D:/.../node_modules/...) qui ne marchent pas dans le runtime Tauri.
	// Solution : extraire la liste des packages externalisés depuis les imports, générer un
	// package.json, npm install --omit=dev (installe seulement le nécessaire), puis réécrire
	// les chemins absolus en chemins relatifs ./node_modules/.
	if (isWindows) {
		// Copier generated/ (clients Prisma) — référencé par des imports absolus
		await cp(join(rootDir, 'generated'), join(appDir, 'generated'), { recursive: true, dereference: true })
		const serverDir = join(appDir, '.output', 'server')
		const absolutePrefix = `file://${rootDir.replace(/\\/g, '/')}`
		// 1. Extraire les packages externalisés depuis les imports dans les .mjs
		const packages = await extractExternalPackages(serverDir, absolutePrefix)
		// 2. Générer un package.json avec ces packages et leurs versions
		await generateServerPackageJson(serverDir, packages)
		// 3. Installer les dépendances (npm install --omit=dev --prefer-offline --ignore-scripts)
		await execFileAsync('npm', ['install', '--omit=dev', '--ignore-scripts', '--prefer-offline', '--legacy-peer-deps', '--prefix', serverDir], { shell: true, maxBuffer: 10 * 1024 * 1024 })
		// 3b. Les peer dependencies ne sont pas installées avec --legacy-peer-deps.
		// Les collecter depuis les packages installés et les ajouter au package.json, puis réinstaller.
		const peerPackages = await collectPeerDependencies(serverDir)
		if (peerPackages.size > 0) {
			console.log(`Adding ${peerPackages.size} peer dependencies...`)
			await addPeerDependenciesToPackageJson(serverDir, peerPackages)
			await execFileAsync('npm', ['install', '--omit=dev', '--ignore-scripts', '--prefer-offline', '--legacy-peer-deps', '--prefix', serverDir], { shell: true, maxBuffer: 10 * 1024 * 1024 })
		}
		// 4. Réécrire les chemins absolus en chemins relatifs ./node_modules/
		await rewriteAbsolutePaths(serverDir, absolutePrefix)
	}
	await writeFile(join(appDir, 'runtime-version'), `${tauriConfig.version}-${Date.now()}\n`)
}

// Extrait la liste des packages externalisés depuis les imports file:// dans les .mjs.
// Retourne un Map<packageName, version> en lisant les package.json dans node_modules.
const extractExternalPackages = async (serverDir: string, absolutePrefix: string): Promise<Map<string, string>> => {
	const nodeModulesPrefix = `${absolutePrefix}/node_modules/`
	const packageRegex = /file:\/\/[^'"]*\/node_modules\/(@[^/'"]+\/[^/'"]+|[^/'"]+)/g
	const packages = new Set<string>()
	const files = await readdir(serverDir, { recursive: true })
	for (const file of files) {
		if (!file.endsWith('.mjs')) continue
		const content = await readFile(join(serverDir, file), 'utf8')
		let match
		while ((match = packageRegex.exec(content)) !== null) {
			// Pour les chemins imbriqués comme nuxt/node_modules/perfect-debounce,
			// on prend le premier segment de package
			packages.add(match[1])
			// Aussi extraire les packages imbriqués (nuxt/node_modules/X -> X)
			const nestedMatch = content.match(new RegExp(`${nodeModulesPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^'"]*?/node_modules/(@[^/'"]+\\/[^/'"]+|[^/'"]+)`))
			if (nestedMatch) packages.add(nestedMatch[1])
		}
	}
	// Récupérer les versions depuis les package.json dans node_modules
	const result = new Map<string, string>()
	for (const pkg of packages) {
		try {
			const pkgJsonPath = join(rootDir, 'node_modules', pkg, 'package.json')
			const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'))
			result.set(pkg, pkgJson.version)
		} catch {
			// Package non trouvé à la racine, peut-être imbriqué — on l'ignore
		}
	}
	return result
}

// Génère un package.json minimal dans .output/server avec les packages externalisés.
// Utilise les versions exactes (pas ^) pour éviter les conflits de résolution npm.
const generateServerPackageJson = async (serverDir: string, packages: Map<string, string>) => {
	const dependencies: Record<string, string> = {}
	for (const [name, version] of packages) {
		dependencies[name] = version
	}
	const pkgJson = {
		name: 'pnltracker-server',
		version: '1.0.0',
		private: true,
		type: 'module',
		dependencies,
	}
	await writeFile(join(serverDir, 'package.json'), JSON.stringify(pkgJson, null, 2))
}

// Collecte les peer dependencies des packages déjà installés dans server/node_modules.
// npm avec --legacy-peer-deps n'installe pas les peer deps automatiquement.
const collectPeerDependencies = async (serverDir: string): Promise<Map<string, string>> => {
	const nodeModulesDir = join(serverDir, 'node_modules')
	const result = new Map<string, string>()
	let entries: string[]
	try {
		entries = await readdir(nodeModulesDir)
	} catch {
		return result
	}
	for (const entry of entries) {
		// Skip .package-lock.json et autres fichiers spéciaux
		if (entry.startsWith('.')) continue
		const pkgDir = entry.startsWith('@')
			? join(nodeModulesDir, entry)
			: join(nodeModulesDir, entry)
		let subEntries: string[]
		try {
			subEntries = await readdir(pkgDir)
		} catch {
			continue
		}
		const pkgJsonPaths = entry.startsWith('@')
			? subEntries.map(sub => join(pkgDir, sub, 'package.json'))
			: [join(pkgDir, 'package.json')]
		for (const pkgJsonPath of pkgJsonPaths) {
			try {
				const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'))
				if (!pkgJson.peerDependencies) continue
				for (const [peerName, peerRange] of Object.entries(pkgJson.peerDependencies)) {
					if (result.has(peerName)) continue
					// Vérifier si le peer est déjà installé
					const peerPath = join(nodeModulesDir, peerName, 'package.json')
					try {
						const peerPkg = JSON.parse(await readFile(peerPath, 'utf8'))
						result.set(peerName, peerPkg.version)
					} catch {
						// Non installé — lire la version depuis le node_modules racine
						try {
							const rootPkg = JSON.parse(await readFile(join(rootDir, 'node_modules', peerName, 'package.json'), 'utf8'))
							result.set(peerName, rootPkg.version)
						} catch {
							console.warn(`Peer dependency ${peerName} not found, skipping`)
						}
					}
				}
			} catch {
				// package.json illisible, on ignore
			}
		}
	}
	return result
}

// Ajoute les peer dependencies au package.json du serveur
const addPeerDependenciesToPackageJson = async (serverDir: string, peerPackages: Map<string, string>) => {
	const pkgJsonPath = join(serverDir, 'package.json')
	const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf8'))
	for (const [name, version] of peerPackages) {
		if (!pkgJson.dependencies[name]) {
			pkgJson.dependencies[name] = version
		}
	}
	await writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
}

// Réécrit les chemins absolus file:///D:/.../node_modules/ en chemins relatifs
// dans tous les fichiers .mjs du répertoire server.
// La profondeur relative dépend de l'emplacement du fichier (index.mjs est à la racine,
// chunks/_/nitro.mjs est 2 niveaux plus profond).
const rewriteAbsolutePaths = async (serverDir: string, absolutePrefix: string) => {
	const files = await readdir(serverDir, { recursive: true })
	for (const file of files) {
		if (!file.endsWith('.mjs')) continue
		const filePath = join(serverDir, file)
		// Calculer la profondeur : index.mjs -> 0, chunks/x.mjs -> 1, chunks/_/x.mjs -> 2
		// readdir recursive utilise \ sur Windows et / sur Linux — normaliser
		const depth = file.split(/[\\/]/).length - 1
		// Pour profondeur 0, utiliser ./ ; sinon ../ répété
		const relPrefix = depth === 0 ? './' : '../'.repeat(depth)
		let content = await readFile(filePath, 'utf8')
		// Remplacer file:///D:/sources3/pnltracker/node_modules/ par <relPrefix>node_modules/
		// node_modules est dans server/node_modules/, donc la profondeur relative est correcte
		content = content.replaceAll(`${absolutePrefix}/node_modules/`, `${relPrefix}node_modules/`)
		// Remplacer file:///D:/sources3/pnltracker/generated/ par <genRelPrefix>generated/
		// generated/ est à appDir/generated/, soit serverDir/../../generated/
		// Depuis un fichier à profondeur N dans server/, il faut (N+2) niveaux pour remonter à appDir
		const genRelPrefix = '../'.repeat(depth + 2)
		content = content.replaceAll(`${absolutePrefix}/generated/`, `${genRelPrefix}generated/`)
		// npm installe les packages à plat, mais certains imports pointent vers des sous-dossiers
		// imbriqués (ex: nuxt/node_modules/perfect-debounce). Les aplatir vers node_modules/<pkg>.
		content = content.replaceAll('node_modules/nuxt/node_modules/', 'node_modules/')
		await writeFile(filePath, content)
	}
}

const platform = process.platform
const arch = process.arch
if ((platform !== 'linux' && platform !== 'win32') || arch !== 'x64') {
	throw new Error(`The Tauri production runtime currently supports Linux x64 and Windows x64 only, got ${platform}-${arch}`)
}
await rm(runtimeDir, { recursive: true, force: true })
await mkdir(appDir, { recursive: true })
if (isWindows) {
	await Promise.all([prepareNode(), prepareApp(), preparePostgres()])
} else {
	await Promise.all([prepareNode(), prepareApp()])
}
