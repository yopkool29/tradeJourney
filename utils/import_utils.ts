export const providerLabels: Record<string, string> = {
    'mt5': 'MetaTrader 5 (XLSX)',
    'nt8': 'NinjaTrader (CSV)',
    'nt8-api': 'NinjaTrader API (Live)',
    'quantower': 'Quantower',
    'ibkr': 'Interactive Brokers (CSV)',
    'ibkr-api': 'Interactive Brokers (Live)',
    'standard': 'Standard CSV Format',
}

export const providerIcons: Record<string, string> = {
    'mt5': 'i-lucide-file-spreadsheet',
    'nt8': 'i-lucide-file-spreadsheet',
    'nt8-api': 'i-lucide-wifi',
    'quantower': 'i-lucide-file-spreadsheet',
    'ibkr': 'i-lucide-file-spreadsheet',
    'ibkr-api': 'i-lucide-wifi',
    'standard': 'i-lucide-file-spreadsheet',
}

export const getProviderLabel = (provider: string) => providerLabels[provider] || provider

export const getProviderIcon = (provider: string) => providerIcons[provider] || 'i-lucide-file'

// Fonction qui prend en compte les métadonnées pour afficher l'icône cloud si nécessaire
export const getProviderIconWithMetadata = (provider: string, metadata?: { useCloudStorage?: boolean } | null) => {
    // Si c'est un profil standard avec cloud storage activé, afficher l'icône cloud
    if (provider === 'standard' && metadata?.useCloudStorage) {
        return 'i-lucide-cloud'
    }
    return getProviderIcon(provider)
}
