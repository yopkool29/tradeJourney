#!/bin/sh

# Vérifier si la base de données existe déjà dans le volume
if [ ! -f /app/vol_data/docker.db ]; then
  echo "Base de données non trouvée dans le volume. Initialisation..."
  
  # Créer le répertoire vol_data si nécessaire
  mkdir -p /app/vol_data
  
  # Vérifier que le schéma Prisma existe
  if [ -f /app/prisma/schema.prisma ]; then
    echo "Schéma Prisma trouvé. Exécution des migrations..."
    
    # Exécuter les migrations Prisma avec le chemin explicite
    npx prisma generate --schema=/app/prisma/schema.prisma
    npx prisma migrate deploy --schema=/app/prisma/schema.prisma
    
    # Vérifier si le script seed existe
    if [ -f /app/scripts/seed.mjs ]; then
      echo "Exécution du script seed..."
      node /app/scripts/seed.mjs
    else
      echo "AVERTISSEMENT: Script seed non trouvé à /app/scripts/seed.mjs"
    fi
    
    echo "Base de données initialisée avec succès!"
  else
    echo "ERREUR: Schéma Prisma non trouvé à /app/prisma/schema.prisma"
    ls -la /app/prisma/
  fi
else
    echo "Base de données existante trouvée dans le volume. Utilisation de celle-ci."
    if [ -f /app/prisma/schema.prisma ]; then
        echo "Schéma Prisma trouvé. Exécution des migrations..."
        npx prisma generate --schema=/app/prisma/schema.prisma
        npx prisma migrate deploy --schema=/app/prisma/schema.prisma
    fi
fi

# Continuer avec le démarrage normal de l'application
exec "$@"
