#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set"
  echo "Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI)"
  exit 1
fi

echo "Backing up schema..."
pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-acl \
  > "$BACKUP_DIR/schema_$TIMESTAMP.sql"

echo "Backing up data (excluding auth)..."
pg_dump "$DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-acl \
  --exclude-table='auth.*' \
  > "$BACKUP_DIR/data_$TIMESTAMP.sql"

echo "Compressing..."
gzip "$BACKUP_DIR/schema_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/data_$TIMESTAMP.sql"

echo "Done: $BACKUP_DIR/schema_$TIMESTAMP.sql.gz"
echo "      $BACKUP_DIR/data_$TIMESTAMP.sql.gz"
