#!/bin/bash
# Generate TypeScript types from Supabase schema

echo "🔄 Generating TypeScript types from Supabase..."

# Check if SUPABASE_PROJECT_ID is set
if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo "❌ Error: SUPABASE_PROJECT_ID environment variable is not set"
  echo "Please set it with: export SUPABASE_PROJECT_ID=your-project-id"
  exit 1
fi

# Generate types
npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > src/types/supabase-generated.ts

if [ $? -eq 0 ]; then
  echo "✅ Types generated successfully at src/types/supabase-generated.ts"
else
  echo "❌ Failed to generate types"
  exit 1
fi
