/**
 * Parse une ligne CSV en tenant compte des guillemets et des guillemets échappés ("")
 * @param line - Ligne CSV à parser
 * @returns Tableau des valeurs
 */
export function parseCSVLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = i + 1 < line.length ? line[i + 1] : null

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Guillemet échappé ("") -> ajouter un seul guillemet
                current += '"'
                i++ // Skip le prochain guillemet
            } else {
                // Toggle inQuotes
                inQuotes = !inQuotes
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }

    values.push(current.trim())
    return values
}
