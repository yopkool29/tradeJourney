/**
 * Decryption utilities for MT5 encrypted data
 * Algorithm: XOR(password) -> Base64 decode -> ROT13
 */

/**
 * Apply ROT13 cipher to text
 */
export const applyROT13 = (text: string): string => {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0)
    const base = code < 97 ? 65 : 97 // A=65, a=97
    return String.fromCharCode(((code - base + 13) % 26) + base)
  })
}

/**
 * Decode Base64 text with MQL5 compatibility
 */
export const decodeBase64 = (text: string): string | null => {
  try {
    // Remove whitespace and fix padding
    const cleaned = text.replace(/[\s\r\n]/g, '')
    const padding = cleaned.length % 4
    const padded = padding ? cleaned + '='.repeat(4 - padding) : cleaned
    
    return atob(padded)
  } catch (e) {
    console.error('Base64 decode error:', e)
    return null
  }
}

/**
 * XOR decrypt hex string with password
 */
export const decryptXOR = (hexString: string, password: string): string | null => {
  try {
    if (!password) return null
    
    // Convert hex to bytes
    const bytes: number[] = []
    for (let i = 0; i < hexString.length; i += 2) {
      bytes.push(parseInt(hexString.substr(i, 2), 16))
    }
    
    // XOR with password bytes
    const passwordBytes = Array.from(password).map(c => c.charCodeAt(0))
    const decrypted = bytes.map((byte, i) => 
      byte ^ passwordBytes[i % passwordBytes.length]
    )
    
    // Convert to string
    return String.fromCharCode(...decrypted)
  } catch (e) {
    console.error('XOR decrypt error:', e)
    return null
  }
}

/**
 * Full decryption: XOR(password) -> Base64 -> ROT13
 */
export const decryptData = (encryptedData: string, password: string): string | null => {
  try {
    // Step 1: XOR decrypt (hex -> base64)
    const base64Text = decryptXOR(encryptedData, password)
    if (!base64Text) {
      console.error('XOR decryption failed')
      return null
    }
    
    // Step 2: Base64 decode
    const rot13Text = decodeBase64(base64Text)
    if (!rot13Text) {
      console.error('Base64 decode failed')
      return null
    }
    
    // Step 3: ROT13
    const plainText = applyROT13(rot13Text)
    
    console.log(`Decrypted successfully: ${plainText.length} bytes`)
    return plainText
  } catch (e) {
    console.error('Decryption failed:', e)
    return null
  }
}

/**
 * Decrypt CSV data and parse to array of objects
 */
export const decryptCSV = (encryptedData: string, password: string): Record<string, string>[] | null => {
  const csvText = decryptData(encryptedData, password)
  if (!csvText) return null
  
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return null
  
  const headers = lines[0].split(',')
  const rows = lines.slice(1).map(line => {
    const values = line.split(',')
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = values[i] || ''
    })
    return obj
  })
  
  return rows
}
