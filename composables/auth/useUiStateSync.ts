export const useUiStateSync = () => {
    const dbStateStore = useDbStateStore()
    const userStore = useUserStore()
    const { log_error, log_info } = useLogView()

    const UI_STATE_VERSION = 100

    const UI_STATE_KEYS = [
        'customInputsPerDb',
        'recentColorsPerDb',
        'recentColors2PerDb',
        'tradeOptionsPerDb',
        'dashBoardFiltersPerDb',
        'dailyFiltersPerDb',
        'calendarFiltersPerDb',
        'columnVisibilityPerDb',
        'showDetailedNotePerDb',
        'tradeChartTfPerDb',
        'tradeChartShowAdjacentPerDb',
        'tradeChartShowAdjacentLinesPerDb',
        'chartSettingsPerDb',
    ] as const

    const collectUiState = (): Record<string, unknown> => {
        const state: Record<string, unknown> = {}
        for (const key of UI_STATE_KEYS) {
            const value = (dbStateStore as unknown as Record<string, unknown>)[key]
            if (value && typeof value === 'object') {
                state[key] = JSON.parse(JSON.stringify(value))
            }
        }
        return state
    }

    const compressGzip = async (data: string): Promise<string> => {
        const stream = new Blob([data]).stream()
        const compressed = stream.pipeThrough(new CompressionStream('gzip'))
        const buffer = await new Response(compressed).arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
    }

    const saveUiState = async (): Promise<boolean> => {
        if (!userStore.user) return false
        try {
            const uiState = collectUiState()
            const compressed = await compressGzip(JSON.stringify(uiState))
            const response = await fetch('/api/auth/save-ui-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ compressed, version: UI_STATE_VERSION }),
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            log_info('UI state saved to server')
            return true
        } catch (err) {
            log_error('Failed to save UI state: ' + String(err))
            return false
        }
    }

    // Use fetch with keepalive for beforeunload — survives page close, no 64KB limit
    const saveUiStateBeacon = (): boolean => {
        if (!userStore.user) return false
        try {
            const uiState = collectUiState()
            const json = JSON.stringify(uiState)
            const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
            new Response(stream).arrayBuffer().then(buffer => {
                const bytes = new Uint8Array(buffer)
                let binary = ''
                for (let i = 0; i < bytes.length; i++) {
                    binary += String.fromCharCode(bytes[i])
                }
                const base64 = btoa(binary)
                fetch('/api/auth/save-ui-state', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ compressed: base64, version: UI_STATE_VERSION }),
                    keepalive: true,
                }).catch(() => {})
            }).catch(() => {})
            return true
        } catch {
            return false
        }
    }

    const restoreUiState = (metadata: unknown): boolean => {
        try {
            if (!metadata || typeof metadata !== 'object') return false
            const meta = metadata as Record<string, unknown>
            const pnltracker = meta.pnltracker as Record<string, unknown> | undefined
            if (!pnltracker || typeof pnltracker !== 'object') return false
            const uiState = pnltracker.uiState as Record<string, unknown> | undefined
            if (!uiState || typeof uiState !== 'object') return false

            const savedVersion = pnltracker.uiStateVersion
            if (savedVersion !== undefined && savedVersion !== UI_STATE_VERSION) {
                log_info(`UI state version mismatch (saved: ${savedVersion}, current: ${UI_STATE_VERSION}), skipping restore`)
                return false
            }

            for (const key of UI_STATE_KEYS) {
                const savedValue = uiState[key]
                if (savedValue && typeof savedValue === 'object') {
                    const storeRef = (dbStateStore as unknown as Record<string, unknown>)[key]
                    if (storeRef && typeof storeRef === 'object') {
                        Object.assign(storeRef, JSON.parse(JSON.stringify(savedValue)))
                    }
                }
            }
            log_info('UI state restored from server')
            return true
        } catch (err) {
            log_error('Failed to restore UI state, ignoring: ' + String(err))
            return false
        }
    }

    return {
        saveUiState,
        saveUiStateBeacon,
        restoreUiState,
    }
}
