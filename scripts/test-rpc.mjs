#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://evraslbpgcafyvvtbqxy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2cmFzbGJwZ2NhZnl2dnRicXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjQ4MTIsImV4cCI6MjA3MTcwMDgxMn0.X7z5jIFwBFvmD6UrJ6KVkxllmz7BDkvHcwOc5pgb8Ew'

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
