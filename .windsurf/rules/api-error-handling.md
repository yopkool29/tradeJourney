# API Error Handling Pattern

## Try/Catch Structure in API Endpoints

### Pattern
```typescript
export default defineEventHandler(async (event) => {
    await auth(event)

    try {
        const prisma = await getPrisma(event)
        const id = Number(getRouterParam(event, 'id'))

        if (!id || isNaN(id)) {
            throw createAppError({
                statusCode: 400,
                message: 'Invalid ID',
                tag: 'api.endpoint.invalid_id'
            })
        }

        const body = await readBody(event)

        const result = await prisma.table.update({ where: { id }, data: body })
        return { success: true, result }
    } catch (error) {
        const err = error as { statusCode?: number; data?: { tag?: string } }
        if (err.statusCode && err.data?.tag) {
            throw error
        }

        throw createAppError({
            statusCode: 500,
            message: 'Error message',
            tag: 'api.endpoint.error',
            error
        })
    }
})
```

### Why This Pattern
- **Try englobes everything**: All code (validations, DB operations) inside try/catch
- **Re-throw check mandatory**: `if (err.statusCode && err.data?.tag) throw error` preserves 4xx errors
- **Consistent structure**: Same pattern across all endpoints

### Anti-Pattern
```typescript
// BAD: Validations outside try/catch without re-throw check
const id = Number(getRouterParam(event, 'id'))
if (!id) {
    throw createAppError({ statusCode: 400, ... })
}

try {
    const result = await prisma.table.update({ where: { id }, data: body })
    return { success: true, result }
} catch (error) {
    throw createAppError({ statusCode: 500, ... }) // 4xx errors from above not caught, but inconsistent pattern
}
```

## Important Note
`await auth(event)` must be placed BEFORE the first `try` block, outside of it.
