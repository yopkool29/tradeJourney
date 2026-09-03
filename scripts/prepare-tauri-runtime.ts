import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { chmod, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

type TauriConfig = {
	version: string
}

const execFileAsync = promisify(execFile)
const nodeVersion = '22.23.2'
const nodeArchive = `node-v${nodeVersion}-linux-x64.tar.xz`
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tauriConfig = JSON.parse(await readFile(join(rootDir, 'src-tauri', 'tauri.conf.json'), 'utf8')) as TauriConfig
const cacheDir = join(rootDir, '.cache', 'tauri')
const archivePath = join(cacheDir, nodeArchive)
const extractedDir = join(cacheDir, `node-v${nodeVersion}-linux-x64`)
const runtimeDir = join(rootDir, 'src-tauri', 'runtime')
const appDir = join(runtimeDir, 'app')

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
	await execFileAsync('tar', ['-xJf', archivePath, '-C', cacheDir])
	await mkdir(join(runtimeDir, 'node', 'bin'), { recursive: true })
	const nodePath = join(runtimeDir, 'node', 'bin', 'node')
	await cp(join(extractedDir, 'bin', 'node'), nodePath)
	await execFileAsync('strip', ['--strip-unneeded', nodePath])
	await chmod(nodePath, 0o755)
	await cp(join(extractedDir, 'LICENSE'), join(runtimeDir, 'node', 'LICENSE'))
}

const prepareApp = async () => {
	await cp(join(rootDir, '.output'), join(appDir, '.output'), { recursive: true, dereference: true })
	await cp(join(rootDir, 'src-tauri', 'server-start.mjs'), join(appDir, 'server-start.mjs'))
	await cp(join(rootDir, 'scripts'), join(appDir, 'scripts'), { recursive: true })
	await cp(join(rootDir, 'pnltracker-tools'), join(appDir, 'pnltracker-tools'), { recursive: true })
	await rm(join(appDir, 'pnltracker-tools', 'python', '.venv'), { recursive: true, force: true })
	await cp(join(rootDir, 'prisma', 'auth', 'migrations'), join(appDir, 'prisma', 'auth', 'migrations'), { recursive: true })
	await mkdir(join(appDir, 'prisma-engine'), { recursive: true })
	await cp(
		join(rootDir, 'generated', 'prisma-auth', 'libquery_engine-debian-openssl-3.0.x.so.node'),
		join(appDir, 'prisma-engine', 'libquery_engine-debian-openssl-3.0.x.so.node'),
	)
	await writeFile(join(appDir, 'runtime-version'), `${tauriConfig.version}-${Date.now()}\n`)
}

if (process.platform !== 'linux' || process.arch !== 'x64') throw new Error('The Tauri production runtime currently supports Linux x64 only')
await rm(runtimeDir, { recursive: true, force: true })
await mkdir(appDir, { recursive: true })
await Promise.all([prepareNode(), prepareApp()])
