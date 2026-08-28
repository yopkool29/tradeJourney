import type { Prisma } from '~/generated/prisma-data'
import { getColumnType } from '~/schema/trade'
import type { TradeFilter } from '~/type'
import { addDays, endOfDay, isValid, startOfDay } from 'date-fns'
import {
	OPERATOR_EQUAL,
	OPERATOR_GREATER_THAN,
	OPERATOR_GREATER_THAN_OR_EQUAL,
	OPERATOR_IN,
	OPERATOR_LESS_THAN,
	OPERATOR_LESS_THAN_OR_EQUAL,
	OPERATOR_NOT_EQUAL,
} from '~/utils'

type ValidTradeFilter = {
	column: string
	operator: string
	value: unknown
}

const isTradeFilter = (filter: unknown): filter is ValidTradeFilter => {
	return typeof filter === 'object' && filter !== null && 'column' in filter && 'operator' in filter && 'value' in filter
}

const getPrismaOperator = (operator: string) => {
	switch (operator) {
		case OPERATOR_EQUAL: return 'equals'
		case OPERATOR_NOT_EQUAL: return 'not'
		case OPERATOR_GREATER_THAN: return 'gt'
		case OPERATOR_LESS_THAN: return 'lt'
		case OPERATOR_GREATER_THAN_OR_EQUAL: return 'gte'
		case OPERATOR_LESS_THAN_OR_EQUAL: return 'lte'
		case OPERATOR_IN: return 'in'
		default: return 'equals'
	}
}

const buildTagFilter = (filter: ValidTradeFilter): Prisma.TradeWhereInput | undefined => {
	let tagIds: number[] = []
	if (typeof filter.value === 'string') {
		tagIds = filter.value.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0)
	} else if (typeof filter.value === 'number' && filter.value > 0) {
		tagIds = [filter.value]
	}
	if (tagIds.length === 0) return undefined
	return {
		tags: {
			some: {
				tagId: { in: tagIds },
			},
		},
	}
}

const buildDateFilter = (filter: ValidTradeFilter, prismaOperator: string, value: unknown): Prisma.TradeWhereInput | undefined => {
	if (!isValid(value)) return undefined
	const date = value as Date
	// Si égalité, on veut tous les trades du jour (peu importe l'heure)
	if (prismaOperator === 'equals') {
		const start = startOfDay(date)
		return { [filter.column]: { gte: start, lt: addDays(start, 1) } }
	}
	if (prismaOperator === 'lt') return { [filter.column]: { lt: startOfDay(date) } }
	if (prismaOperator === 'gt') return { [filter.column]: { gt: endOfDay(date) } }
	if (prismaOperator === 'lte') return { [filter.column]: { lte: endOfDay(date) } }
	if (prismaOperator === 'gte') return { [filter.column]: { gte: startOfDay(date) } }
	return { [filter.column]: { [prismaOperator]: value } }
}

const buildFilter = (filter: ValidTradeFilter): Prisma.TradeWhereInput | undefined => {
	const prismaOperator = getPrismaOperator(filter.operator)
	// Gestion spéciale pour les tags (OR logic entre plusieurs tags)
	if (filter.column === 'tags' && (filter.operator === OPERATOR_EQUAL || filter.operator === OPERATOR_IN)) {
		return buildTagFilter(filter)
	}
	const type = getColumnType(filter.column)
	let value: unknown = filter.value
	if (type === 'number' && !Array.isArray(filter.value)) value = Number(filter.value)
	if (type === 'date') {
		value = typeof filter.value === 'number' || typeof filter.value === 'string' ? new Date(filter.value) : filter.value
		return buildDateFilter(filter, prismaOperator, value)
	}
	// Gestion spéciale pour l'opérateur 'in' avec les tableaux
	if (prismaOperator === 'in' && Array.isArray(filter.value)) {
		const values = type === 'number' ? filter.value.map(item => Number(item)) : filter.value
		return { [filter.column]: { in: values } }
	}
	return { [filter.column]: { [prismaOperator]: value } }
}

// Prisma where clause with AND for multiple filters
// Note: userId is no longer needed in filters as we're using PostgreSQL schema isolation
export const buildTradeWhere = (filters: TradeFilter[], showInactive: boolean): Prisma.TradeWhereInput => {
	const where: Prisma.TradeWhereInput = {}
	if (Array.isArray(filters) && filters.length > 0) {
		where.AND = filters
			.filter(isTradeFilter)
			.filter(filter => !(filter.column === 'accountId' && filter.operator === '=' && filter.value === -1))
			.map(buildFilter)
			.filter((filter): filter is Prisma.TradeWhereInput => filter !== undefined)
	}
	if (!showInactive) where.active = true
	return where
}
