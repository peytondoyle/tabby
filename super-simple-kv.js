#!/usr/bin/env node

/**
 * Super Simple KV Setup - Just 3 steps!
 */

import readline from 'readline';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function superSimpleKV() {
  console.log('🗄️  Super Simple KV Setup - Just 3 Steps!');
  console.log('==========================================\n');

  console.log('I\'ll open the Vercel dashboard for you and guide you through the minimal steps.\n');

  // Step 1: Open Vercel dashboard
  console.log('Step 1: Opening Vercel dashboard...');
  try {
    execSync('open https://vercel.com/dashboard', { stdio: 'ignore' });
    console.log('✅ Dashboard opened in your browser');
  } catch (error) {
    console.log('⚠️  Please open: https://vercel.com/dashboard');
  }

  await question('\nPress Enter when you\'re on the Vercel dashboard...');

  // Step 2: Create KV database
  console.log('\nStep 2: Creating KV database...');
  console.log('1. Click on your "tabby" project');
  console.log('2. Go to "Storage" tab');
  console.log('3. Click "Create Database"');
  console.log('4. Choose "KV" (Key-Value)');
  console.log('5. Name it: tabby-receipt-cache');
  console.log('6. Click "Create"');
  console.log('7. Click on the new database');
  console.log('8. Copy the "REST API URL" and "REST API Token"');

  const kvUrl = await question('\nPaste the KV REST API URL here: ');
  const kvToken = await question('Paste the KV REST API Token here: ');

  if (!kvUrl.trim() || !kvToken.trim()) {
    console.log('\n❌ Both URL and Token are required.');
    return;
  }

  // Step 3: Set environment variables automatically
  console.log('\nStep 3: Setting environment variables...');
  
  try {
    // Set environment variables using Vercel CLI
    console.log('Setting VERCEL_KV_REST_API_URL...');
    execSync(`echo "${kvUrl}" | vercel env add VERCEL_KV_REST_API_URL production`, { 
      stdio: 'pipe'
    });
    console.log('✅ Set VERCEL_KV_REST_API_URL');

    console.log('Setting VERCEL_KV_REST_API_TOKEN...');
    execSync(`echo "${kvToken}" | vercel env add VERCEL_KV_REST_API_TOKEN production`, { 
      stdio: 'pipe'
    });
    console.log('✅ Set VERCEL_KV_REST_API_TOKEN');

    // Step 4: Redeploy automatically
    console.log('\nStep 4: Redeploying...');
    console.log('🚀 Redeploying your project...');
    execSync('vercel --prod --yes', { stdio: 'inherit' });
    console.log('✅ Redeployment complete!');

    console.log('\n🎉 KV Setup Complete!');
    console.log('\n📊 Test the performance:');
    console.log('1. Go to: https://tabby-9swv45d64-peyton-doyle.vercel.app');
    console.log('2. Upload a receipt');
    console.log('3. Check the processing time');
    console.log('4. Upload the same receipt again (should be instant!)');
    console.log('\n🔍 Look for "X-Cache-Type: KV" in browser console');

  } catch (error) {
    console.log('⚠️  Could not set environment variables automatically.');
    console.log('Please set them manually:');
    console.log('1. Go to: https://vercel.com/dashboard');
    console.log('2. Select your "tabby" project');
    console.log('3. Go to "Settings" → "Environment Variables"');
    console.log('4. Add these variables:');
    console.log(`   - VERCEL_KV_REST_API_URL: ${kvUrl}`);
    console.log(`   - VERCEL_KV_REST_API_TOKEN: ${kvToken}`);
    console.log('5. Redeploy your project');
  }

  rl.close();
}

superSimpleKV();
