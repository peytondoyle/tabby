#!/usr/bin/env node

/**
 * Preflight check for required environment variables
 * Exits with non-zero code if any required vars are missing
 */

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_PROJECT_REF'
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  console.error('\n💡 Copy .env.example to .env and fill in the values:')
  console.error('   cp .env.example .env')
  console.error('\n🔗 Get your Supabase credentials from:')
  console.error('   https://supabase.com/dashboard/project/[YOUR_PROJECT]/settings/api')
  process.exit(1)
}

console.log('✅ All required environment variables are set')
process.exit(0)
