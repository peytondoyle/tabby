#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables:')
  if (!supabaseUrl) console.error('   SUPABASE_URL is required')
  if (!supabaseAnonKey) console.error('   SUPABASE_ANON_KEY is required')
  console.error('\n💡 Set these in your .env.local file or pass them as environment variables:')
  console.error('   SUPABASE_URL=https://your-project.supabase.co')
  console.error('   SUPABASE_ANON_KEY=your-anon-key')
  process.exit(1)
}

// Warn if secret key is accidentally used in client code
if (supabaseAnonKey && supabaseAnonKey.startsWith('sb_secret_')) {
  console.error(
    '🚨 CRITICAL SECURITY WARNING: Secret key detected!\n' +
    'The secret key should NEVER be used in scripts or client-side code.\n' +
    'Use the anon key instead.'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Sample bill token from seed data
const sampleBillToken = 'e047f028995f1775e49463406db9943d'

async function testRPC() {
  console.log('🧪 Testing RPC function...')
  
  try {
    const { data, error } = await supabase.rpc('get_bill_by_token', {
      bill_token: sampleBillToken
    })

    if (error) {
      console.error('❌ RPC Error:', error)
      return
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No data returned')
      return
    }

    const bill = data[0] // Get first bill from array
    console.log('✅ RPC Success!')
    console.log('📄 Bill Data:')
    console.log(`   Title: ${bill.title}`)
    console.log(`   Place: ${bill.place}`)
    console.log(`   Date: ${bill.date}`)
    console.log(`   Subtotal: $${bill.subtotal}`)
    console.log(`   Tax: $${bill.sales_tax}`)
    console.log(`   Tip: $${bill.tip}`)
    
  } catch (err) {
    console.error('❌ Test failed:', err)
  }
}

testRPC()
