# commandes

```bash
pnpm prisma generate --schema=prisma/auth/schema.prisma
pnpm prisma generate --schema=prisma/data/schema.prisma
```

```bash
npx prisma migrate dev --name add_user_token --schema=prisma/auth/schema.prisma
```