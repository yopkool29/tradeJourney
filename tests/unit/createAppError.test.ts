import { describe, it, expect } from 'vitest'
import { createAppError } from '../../server/utils/errors'

describe('createAppError', () => {
	it('should return a H3Error with the statusCode and message', () => {
		const error = createAppError({ statusCode: 400, message: 'Bad Request' })
		expect(error).toBeInstanceOf(Error)
		expect(error).toHaveProperty('statusCode', 400)
		expect(error).toHaveProperty('message', 'Bad Request')
	})

	it('should return a H3Error with the tag', () => {
		const error = createAppError({ statusCode: 400, message: 'Bad Request', tag: 'TAG' })
		expect(error).toBeInstanceOf(Error)
		expect(error).toHaveProperty('statusCode', 400)
		expect(error).toHaveProperty('message', 'Bad Request')
		expect(error).toHaveProperty('data', { tag: 'TAG' })
	})

	it('should return a H3Error with the original error message', () => {
		const error = createAppError({
			statusCode: 400,
			message: 'Bad Request',
			error: new Error('Original error message')
		})
		expect(error).toBeInstanceOf(Error)
		expect(error).toHaveProperty('statusCode', 400)
		expect(error).toHaveProperty('message', 'Bad Request')
		expect(error).toHaveProperty('data', { originalMessage: 'Original error message' })
	})

	it('should return a H3Error with the original error message and the tag', () => {
		const error = createAppError({
			statusCode: 400,
			message: 'Bad Request',
			error: new Error('Original error message'),
			tag: 'TAG'
		})
		expect(error).toBeInstanceOf(Error)
		expect(error).toHaveProperty('statusCode', 400)
		expect(error).toHaveProperty('message', 'Bad Request')
		expect(error).toHaveProperty('data', { tag: 'TAG', originalMessage: 'Original error message' })
	})
})

