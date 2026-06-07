#!/bin/sh
set -e

# Set DATABASE_URL if it's not defined but ALGOSPHERE_DATABASE_URL is
if [ -z "$DATABASE_URL" ] && [ -n "$ALGOSPHERE_DATABASE_URL" ]; then
  export DATABASE_URL="$ALGOSPHERE_DATABASE_URL"
fi

# Detect database provider
PROVIDER="sqlite"
if [ -n "$DATABASE_URL" ]; then
  if echo "$DATABASE_URL" | grep -q "^postgres"; then
    PROVIDER="postgresql"
  elif echo "$DATABASE_URL" | grep -q "^mysql"; then
    PROVIDER="mysql"
  fi
fi

echo "Detected database provider: $PROVIDER"
node switch-db.js "$PROVIDER"

# If a database URL is present, run db push to sync schema
if [ -n "$DATABASE_URL" ]; then
  echo "Prisma database URL detected. Pushing schema..."
  npx prisma db push --skip-generate
else
  echo "No database URL detected. Skipping database sync."
fi

echo "Starting Node.js application..."
exec node dist/index.js


