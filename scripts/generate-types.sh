#!/bin/bash
# Generate TypeScript types from Supabase schema

echo "🔄 Generating TypeScript types from Supabase..."

SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-cuzuzitadwmrlocqhhtu}"

# Generate types
npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > src/types/database.ts

if [ $? -eq 0 ]; then
  echo "✅ Types generated successfully at src/types/database.ts"
else
  echo "❌ Failed to generate types"
  exit 1
fi
