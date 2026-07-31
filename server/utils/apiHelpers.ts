import { createAppError } from './errors'
import { getPrisma } from './db'
import type { DataPrismaClient } from '~/generated/prisma-data'
import type { ZodType } from 'zod'
import type { H3Event } from 'h3'

// Récupère le contexte API complet : auth + prisma + userId + dbName
// Combine auth(event) et getPrisma(event) en un seul appel
export const getApiContext = async (event: H3Event): Promise<{
	prisma: DataPrismaClient
	userId: number
	dbName: string
}> => {
	await auth(event)
	const prisma = await getPrisma(event)
	const userId = Number(event.context.userId)
	const dbName = event.context.dbName as string
	return { prisma, userId, dbName }
}

// Valide et retourne un ID numérique depuis les params URL
// Lance une AppError 400 si l'ID est invalide
export const getValidatedId = (event: H3Event, paramName = 'id', errorTag = 'api.invalid_id'): number => {
	const raw = getRouterParam(event, paramName)
	const id = parseInt(raw || '', 10)
	if (isNaN(id)) {
		throw createAppError({
			statusCode: 400,
			message: `Invalid ${paramName}`,
			tag: errorTag,
		})
	}
	return id
}

// Lit et valide le body d'une requête avec un schéma Zod
// Lance une AppError 400 si la validation échoue
export const parseBody = async <T>(event: H3Event, schema: ZodType<T>): Promise<T> => {
	const body = await readBody(event)
	try {
		return schema.parse(body)
	} catch (error) {
		throw createAppError({
			statusCode: 400,
			message: 'Invalid request body',
			error,
			tag: 'api.invalid_body',
		})
	}
}
