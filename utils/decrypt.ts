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
 * Decode Base64 to bytes array
 */
const base64ToBytes = (text: string): number[] | null => {
  try {
    const cleaned = text.replace(/[\s\r\n]/g, '')
    const padding = cleaned.length % 4
    const padded = padding ? cleaned + '='.repeat(4 - padding) : cleaned
    
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const charMap: Record<string, number> = {}
    for (let i = 0; i < base64Chars.length; i++) {
      charMap[base64Chars[i]] = i
    }
    
    const bytes: number[] = []
    for (let i = 0; i < padded.length; i += 4) {
      const c1 = charMap[padded[i]] ?? 0
      const c2 = charMap[padded[i + 1]] ?? 0
      const c3 = charMap[padded[i + 2]] ?? 0
      const c4 = charMap[padded[i + 3]] ?? 0
      
      bytes.push((c1 << 2) | (c2 >> 4))
      if (padded[i + 2] !== '=') bytes.push(((c2 & 15) << 4) | (c3 >> 2))
      if (padded[i + 3] !== '=') bytes.push(((c3 & 3) << 6) | c4)
    }
    
    return bytes
  } catch (e) {
    console.error('Base64 to bytes error:', e)
    return null
  }
}

/**
 * Encode bytes array to Base64
 */
const bytesToBase64 = (bytes: number[]): string => {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]
    const b2 = bytes[i + 1] ?? 0
    const b3 = bytes[i + 2] ?? 0
    
    const n = (b1 << 16) | (b2 << 8) | b3
    result += base64Chars[(n >> 18) & 63]
    result += base64Chars[(n >> 12) & 63]
    result += (i + 1 < bytes.length) ? base64Chars[(n >> 6) & 63] : '='
    result += (i + 2 < bytes.length) ? base64Chars[n & 63] : '='
  }
  return result
}

/**
 * Decode Base64 to string (UTF-8)
 */
export const decodeBase64 = (text: string): string | null => {
  const bytes = base64ToBytes(text)
  if (!bytes) return null
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes))
}

/**
 * XOR decrypt: decode Base64, XOR with password, return ASCII string (which is Base64)
 */
export const decryptXOR = (base64String: string, password: string): string | null => {
  try {
    if (!password) return null
    
    // Decode Base64 to bytes (XORed bytes)
    const bytes = base64ToBytes(base64String)
    if (!bytes) {
      console.error('Failed to decode Base64 input')
      return null
    }
    
    // XOR with password bytes to get original bytes
    const passwordBytes = Array.from(password).map(c => c.charCodeAt(0))
    const decrypted = bytes.map((byte, i) => 
      byte ^ passwordBytes[i % passwordBytes.length]
    )
    
    // Convert bytes to ASCII string (which is the Base64 string of ROT13 text)
    return String.fromCharCode(...decrypted)
  } catch (e) {
    console.error('XOR decrypt error:', e)
    return null
  }
}

/**
 * Check if string is valid Base64
 */
const isBase64 = (str: string): boolean => {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(str.trim())
}

/**
 * Full decryption: Base64 -> XOR(password) -> Base64 decode -> ROT13
 */
export const decryptData = (encryptedData: string, password: string): string | null => {
  try {
    const cleanData = encryptedData.trim()
    
    // If no password, try Base64 + ROT13 only
    if (!password) {
      const rot13Text = decodeBase64(cleanData)
      if (!rot13Text) return null
      return applyROT13(rot13Text)
    }
    
    // Check if data looks like Base64 (not hex)
    if (!isBase64(cleanData)) {
      console.log('Data is not valid Base64')
      return null
    }
    
    // Step 1: XOR decrypt (Base64 -> bytes -> XOR -> Base64)
    const base64Text = decryptXOR(cleanData, password)
    if (!base64Text) {
      console.error('XOR decryption failed')
      return null
    }
    
    // Step 2: Base64 decode to get ROT13 text
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
