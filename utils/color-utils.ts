/**
 * Color utility functions for converting between color formats
 */

/**
 * Convert hex color to rgba
 * @param hex - Hex color string (#RGB or #RRGGBB)
 * @param alpha - Alpha value (0-1)
 * @returns rgba string
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Handle short hex (#RGB)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('')
  }
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Convert rgba string to hex
 * @param rgba - rgba string (e.g., "rgba(255, 87, 51, 1)")
 * @returns hex string (e.g., "#FF5733")
 */
export function rgbaToHex(rgba: string): string {
  // Extract RGB values from rgba string
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  
  if (!match) {
    return '#000000'
  }
  
  const r = parseInt(match[1])
  const g = parseInt(match[2])
  const b = parseInt(match[3])
  
  // Convert to hex
  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Convert any color format to rgba with specified alpha
 * @param color - Color string (hex or rgba)
 * @param alpha - Alpha value (0-1)
 * @returns rgba string
 */
export function colorToRgba(color: string, alpha: number = 1): string {
  // If already rgba, replace alpha
  if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
    return color.replace(/[\d.]+\)$/, `${alpha})`)
  }
  
  // If hex, convert to rgba
  if (color.startsWith('#')) {
    return hexToRgba(color, alpha)
  }
  
  // Fallback
  return `rgba(0, 0, 0, ${alpha})`
}

/**
 * Normalize color to hex format
 * @param color - Color string (hex or rgba)
 * @returns hex string
 */
export function normalizeColorToHex(color: string): string {
  // Already hex
  if (color.startsWith('#')) {
    return color.toUpperCase()
  }
  
  // Convert rgba to hex
  if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
    return rgbaToHex(color)
  }
  
  // Fallback
  return '#000000'
}
