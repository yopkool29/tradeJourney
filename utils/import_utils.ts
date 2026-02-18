export const providerLabels: Record<string, string> = {
    'mt5': 'MetaTrader 5 (XLSX)',
    'nt8': 'NinjaTrader (CSV)',
    'nt8-api': 'NinjaTrader API (Live)',
    'quantower': 'Quantower',
    'ibkr': 'Interactive Brokers (CSV)',
    'ibkr-api': 'Interactive Brokers (Live)',
    'standard': 'Standard CSV Format',
    'standard-live': 'Standard CSV Format (Cloud)',
}

export const providerIcons: Record<string, string> = {
    'mt5': 'i-lucide-file-spreadsheet',
    'nt8': 'i-lucide-file-spreadsheet',
    'nt8-api': 'i-lucide-wifi',
    'quantower': 'i-lucide-file-spreadsheet',
    'ibkr': 'i-lucide-file-spreadsheet',
    'ibkr-api': 'i-lucide-wifi',
    'standard': 'i-lucide-file-spreadsheet',
    'standard-live': 'i-lucide-cloud',
}

export const getProviderLabel = (provider: string) => providerLabels[provider] || provider
export const getProviderIcon = (provider: string) => providerIcons[provider] || 'i-lucide-file'
