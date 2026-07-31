export const formatNumberValue = (value: number | null | undefined, decimals: number = 2): string => {
	if (value === undefined || value === null || !isFinite(value)) return '---'
	return value.toFixed(decimals)
}
