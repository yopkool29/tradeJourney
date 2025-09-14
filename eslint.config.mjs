// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Your custom configs here
  {
    // Ignorer des répertoires spécifiques
    ignores: [
      // Exemples de répertoires à ignorer
      '.nuxt/**',
      'node_modules/**',
      'generated/**',
      'dist/**',
      'temp/**',  // Ignorer le répertoire temp
      // Vous pouvez ajouter d'autres répertoires ici
    ],
    rules: {
      'vue/first-attribute-linebreak': 'error', // Désactive l'avertissement pour les sauts de ligne avant les attributs
      'vue/html-self-closing': 'off', // Désactive l'avertissement pour les balises self-closing
      'vue/no-multiple-template-root': 'off', // (optionnel, pour Vue 3)
      'vue/no-multiple-template-attributes': 'off',
      'vue/no-template-shadow': 'warn',
      'vue/no-unused-vars': 'warn',
      'vue/no-useless-template-attributes': 'warn',
      'vue/no-side-effects-in-computed-properties': 'warn',
      'no-sequences': 'warn',
      'no-unused-expressions': 'warn',
    },
  }
)
