// Mock localStorage for Node.js environment before @vue/devtools-kit initializes
if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    const store: Record<string, string> = {}
    Object.defineProperty(globalThis, 'localStorage', {
        value: {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => { store[key] = value },
            removeItem: (key: string) => { delete store[key] },
            clear: () => { Object.keys(store).forEach(k => delete store[k]) },
            get length() { return Object.keys(store).length },
            key: (index: number) => Object.keys(store)[index] ?? null,
        },
        writable: true,
    })
}
