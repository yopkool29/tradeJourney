export const formatDurationMinutes = (minutes: number): string => {
	if (minutes < 60) {
		return `${Math.round(minutes)}min`
	}
	const hours = Math.floor(minutes / 60)
	const mins = Math.round(minutes % 60)
	return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

export const formatDurationSeconds = (seconds: number): string => {
	if (seconds < 60) {
		return `${Math.round(seconds)}s`
	}
	const hours = Math.floor(seconds / 3600)
	const mins = Math.floor((seconds % 3600) / 60)
	const secs = Math.round(seconds % 60)
	if (hours > 0) {
		return secs > 0 ? `${hours}h ${mins}m ${secs}s` : `${hours}h ${mins}m`
	}
	return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}
