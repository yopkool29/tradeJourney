## 0. Authentification
Pour des raisons de test, utilisez :
Email: admin@mail.fr
Mot de passe: admin

## 1. Lancer scipt
DATABASE_URL="file:/home/patrice/sources3/trade/tradejourney/prisma/dev.db" node scripts/trades-delete.mjs
DATABASE_URL="file:/home/patrice/sources3/trade/tradejourney/prisma/dev.db" node scripts/create-user.mjs
DATABASE_URL="file:/home/patrice/sources3/trade/tradejourney/prisma/dev.db" node scripts/seed.mjs
DATABASE_URL="file:/home/patrice/sources3/trade/tradejourney/prisma/dev.db" node scripts/delete-all.mjs

## 2. test

npx vitest run tests
npx vitest run tests/mt5-parser.test.ts
npx vitest run tests/nt-parser.test.ts
npx vitest tests/mt5-parser.test.ts
npx vitest tests/nt-parser.test.ts

# 3. Creation Db && Prisma 

rm -rf generated
rm prisma/dev.db
npx prisma db push
# npx prisma migrate dev --name add_display_name_to_account
npx prisma db seed
npx prisma generate
DATABASE_URL="file:./dev.db" node scripts/seed.mjs

# 4. Count lines
find . -type f \( -name "*.vue" -o -name "*.ts" -o -name "*.js" -o -name "*.prisma" -o -name "*.py" \) -not -path "*/node_modules/*" -not -path "*/generated/*" -not -path "*/.nuxt/*" -not -path "*/.ouput/*" -not -path "*/.vscode/*" -not -path "*/temp/*" | xargs wc -l

# prettier
pnpm prettier --write "**/*.vue"

# eslint
pnpm eslint "**/*.{js,ts,vue}" --ignore-pattern "temp/**"