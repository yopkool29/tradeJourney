// Simple in-memory rate limiter for API endpoints
// Tracks requests per user with a sliding window

type RateLimitEntry = {
	count: number
	windowStart: number
}

const store = new Map<string, RateLimitEntry>()

export const createRateLimiter = (options: {
	windowMs: number // Time window in milliseconds
	maxRequests: number // Max requests per window
}) => {
	const { windowMs, maxRequests } = options

	return {
		check: (userId: string | number): { allowed: boolean; remaining: number; resetTime: number } => {
			const key = String(userId)
			const now = Date.now()

			// Clean up old entries
			const entry = store.get(key)
			if (entry && now - entry.windowStart > windowMs) {
				store.delete(key)
			}

			const current = store.get(key)
			if (!current) {
				store.set(key, { count: 1, windowStart: now })
				return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs }
			}

			if (current.count >= maxRequests) {
				const resetTime = current.windowStart + windowMs
				return { allowed: false, remaining: 0, resetTime }
			}

			current.count++
			return { allowed: true, remaining: maxRequests - current.count, resetTime: current.windowStart + windowMs }
		}
	}
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
	const now = Date.now()
	for (const [key, entry] of store) {
		// Remove entries older than 1 hour
		if (now - entry.windowStart > 60 * 60 * 1000) {
			store.delete(key)
		}
	}
}, 5 * 60 * 1000)
