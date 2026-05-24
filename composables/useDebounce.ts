type AnyFn = (...args: unknown[]) => unknown

type Options = {
	leading?: boolean
	maxWait?: number
}

export const useDebounce = <T extends AnyFn>(fn: T, ms: number, options: Options = {}) => {
	const { leading = false, maxWait } = options

	let timeout: ReturnType<typeof setTimeout> | null = null
	let lastCallTime: number | null = null
	let leadingFired = false

	return (...args: Parameters<T>) => {
		const now = Date.now()

		if (timeout) {
			clearTimeout(timeout)
		}

		if (leading && !leadingFired) {
			leadingFired = true
			lastCallTime = now
			fn(...args)
		}

		timeout = setTimeout(() => {
			timeout = null
			leadingFired = false
			lastCallTime = null
			if (!leading) {
				fn(...args)
			}
		}, ms)

		if (maxWait !== undefined && lastCallTime !== null && now - lastCallTime >= maxWait) {
			if (timeout) {
				clearTimeout(timeout)
				timeout = null
			}
			leadingFired = false
			lastCallTime = now
			fn(...args)
		}
	}
}
