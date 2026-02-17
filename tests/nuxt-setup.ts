/**
 * Ce fichier n'est plus nécessaire car nous utilisons maintenant l'environnement Nuxt intégré de Vitest.
 * 
 * Voir la documentation officielle: https://nuxt.com/docs/getting-started/testing
 * 
 * La configuration est maintenant dans vitest.config.ts avec defineVitestConfig.
 * Les tests peuvent utiliser directement les fonctionnalités de Nuxt et $fetch.
 */

// Nous gardons ce fichier vide pour référence, mais il pourrait être supprimé.

// Fonction pour nettoyer après les tests
export async function cleanupNuxtTest() {
  // Cette fonction sera appelée dans afterAll
  // Actuellement vide car @nuxt/test-utils gère le nettoyage
}

// Exemple d'utilisation dans un test
/*
describe('Mon test Nuxt', async () => {
  // Configurer Nuxt avant tous les tests
  beforeAll(async () => {
    await setupNuxtTest()
  })

  // Nettoyer après tous les tests
  afterAll(async () => {
    await cleanupNuxtTest()
  })

  it('devrait accéder à une route API', async () => {
    const response = await $fetch('/api/some-endpoint')
    expect(response).toBeDefined()
  })
})
*/
