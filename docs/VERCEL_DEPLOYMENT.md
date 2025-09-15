# Déploiement de TradeJourney sur Vercel

Ce guide explique comment déployer l'application TradeJourney sur Vercel.

## Prérequis

- Un compte [Vercel](https://vercel.com)
- Git installé sur votre machine
- Un dépôt GitHub, GitLab ou Bitbucket contenant votre projet TradeJourney

## Configuration du projet pour Vercel

Le projet est déjà configuré pour Vercel avec les fichiers suivants :

- `vercel.json` - Configuration spécifique à Vercel
- `nuxt.config.ts` - Configuration Nuxt adaptée pour Vercel

## Étapes de déploiement

### 1. Connectez-vous à Vercel

Visitez [Vercel](https://vercel.com) et connectez-vous avec votre compte ou créez-en un nouveau.

### 2. Importez votre projet

1. Cliquez sur "Add New..." puis "Project"
2. Connectez votre compte GitHub, GitLab ou Bitbucket si ce n'est pas déjà fait
3. Sélectionnez le dépôt contenant votre projet TradeJourney

### 3. Configurez le projet

Dans l'interface de configuration du projet :

1. **Framework Preset** : Sélectionnez "Nuxt.js"
2. **Build Command** : Laissez la valeur par défaut `pnpm build` (ou modifiez selon votre gestionnaire de paquets)
3. **Output Directory** : Laissez la valeur par défaut `.output/public`
4. **Environment Variables** : Ajoutez les variables d'environnement suivantes :
   - `DATABASE_URL` : URL de votre base de données PostgreSQL (vous devrez migrer de SQLite vers PostgreSQL pour la production)

### 4. Configuration de la base de données

TradeJourney utilise SQLite par défaut, mais pour un déploiement sur Vercel, vous devez utiliser une base de données compatible comme PostgreSQL :

1. Créez une base de données PostgreSQL sur un service comme [Supabase](https://supabase.com), [Railway](https://railway.app), ou [Neon](https://neon.tech)
2. Modifiez votre fichier `prisma/schema.prisma` pour utiliser PostgreSQL :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Exécutez la migration de la base de données :

```bash
npx prisma migrate deploy
```

### 5. Déployez le projet

Cliquez sur "Deploy" pour lancer le déploiement.

### 6. Création d'un utilisateur

Après le déploiement, vous devrez créer un utilisateur administrateur. Pour cela :

1. Allez dans la section "Functions" de votre projet Vercel
2. Créez une nouvelle fonction temporaire ou utilisez la console Vercel pour exécuter :

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
  const hashedPassword = await bcrypt.hash('admin', 10);
  
  const user = await prisma.user.create({
    data: {
      email: 'admin@mail.fr',
      password: hashedPassword,
    },
  });
  
  console.log('User created:', user);
}

createUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Maintenance et mises à jour

Pour mettre à jour votre application déployée sur Vercel :

1. Poussez vos modifications sur votre dépôt Git
2. Vercel détectera automatiquement les changements et déploiera la nouvelle version

## Dépannage

### Problèmes de base de données

Si vous rencontrez des erreurs liées à la base de données :

1. Vérifiez que votre variable d'environnement `DATABASE_URL` est correctement configurée
2. Assurez-vous que votre schéma Prisma est compatible avec PostgreSQL
3. Vérifiez les journaux de déploiement pour identifier les erreurs spécifiques

### Problèmes de build

Si le build échoue :

1. Consultez les journaux de build sur Vercel
2. Vérifiez que toutes les dépendances sont correctement installées
3. Assurez-vous que votre configuration Nuxt est compatible avec Vercel
