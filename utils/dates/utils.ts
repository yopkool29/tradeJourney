import { format } from "date-fns";

export function formatDateForFilename(date: Date = new Date()): string {
	return format(date, 'yyyy-MM-dd-HH-mm')
}

export const getDatetimeLocalNow = (date: Date = new Date()): string => {
	return format(date, "yyyy-MM-dd'T'HH:mm")
}
