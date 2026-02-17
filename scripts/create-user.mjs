// Script Node.js pour exécuter trades-delete.ts via tsx ou ts-node
// Utilisation : node scripts/run-trades-delete.mjs

import { exec } from 'child_process'

exec('npx tsx scripts/create-user.ts', (error, stdout, stderr) => {
    if (error) {
        console.error(`Erreur d\'exécution : ${error.message}`)
        process.exit(1)
    }
    if (stderr) {
        console.error(`stderr : ${stderr}`)
    }
    if (stdout) {
        console.log(stdout)
    }
})
