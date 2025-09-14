import { describe, it, expect } from 'vitest'
import { $fetch } from '#app'

describe('API Tests', () => {
    it('devrait retourner les day-tags', async () => {
        try {
            // Vous devrez vous connecter d'abord si l'API nécessite une authentification
            // Pour les tests d'API authentifiée, il faudrait d'abord faire un login
            // et stocker le token/cookie de session
            
            // Utiliser $fetch de Nuxt avec un chemin relatif
            const response = await $fetch('/api/day-tags')
            console.log('Réponse API:', response)
            expect(response).toBeDefined()
            
            // Vérifier la structure des données selon le schéma Zod DayTag
            // qui inclut une propriété tags obligatoire
            if (Array.isArray(response)) {
                // Vérifier que chaque élément a une propriété tags
                for (const dayTag of response) {
                    expect(dayTag).toHaveProperty('tags')
                    expect(Array.isArray(dayTag.tags)).toBe(true)
                }
            }
        } catch (error) {
            console.error('Erreur lors de l\'appel API:', error)
            throw error
        }
    })
})
