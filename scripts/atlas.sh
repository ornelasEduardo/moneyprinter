#!/bin/bash

# Wrapper script to run Atlas commands inside the Docker container
# Usage: ./scripts/atlas.sh [command] [args...]
# Example: ./scripts/atlas.sh migrate diff --env docker

docker-compose run --rm atlas "$@"
EXIT_CODE=$?

# If the command was "migrate apply" and it succeeded, sync Prisma
if [ $EXIT_CODE -eq 0 ] && [ "$1" = "migrate" ] && [ "$2" = "apply" ]; then
  echo "Atlas migration applied successfully. Syncing Prisma..."
  # Prisma automatically loads .env file
  npx prisma db pull
  npx prisma generate
fi

exit $EXIT_CODE
