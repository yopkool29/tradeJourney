#!/bin/sh
#docker compose build > /tmp/docker-build.log
docker compose build
#docker compose build --progress=plain > /tmp/docker-build.log
#docker compose run --rm migration npx prisma db seed
