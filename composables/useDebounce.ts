// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any

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

		return new Promise<Awaited<ReturnType<T>>>((resolve) => {
			const execute = () => {
				Promise.resolve(fn(...args)).then(resolve as (value: unknown) => void)
			}

			if (leading && !leadingFired) {
				leadingFired = true
				lastCallTime = now
				execute()
			}

			timeout = setTimeout(() => {
				timeout = null
				leadingFired = false
				lastCallTime = null
				if (!leading) {
					execute()
				}
			}, ms)

			if (maxWait !== undefined && lastCallTime !== null && now - lastCallTime >= maxWait) {
				if (timeout) {
					clearTimeout(timeout)
					timeout = null
				}
				leadingFired = false
				lastCallTime = now
				execute()
			}
		})
	}
}
