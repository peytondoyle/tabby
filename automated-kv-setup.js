#!/usr/bin/env node

/**
 * Automated KV Setup Script
 * Helps you get KV credentials and set them up automatically
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

async function setupKV() {
  console.log('🗄️  Automated Vercel KV Setup');
  console.log('=============================\n');

  try {
    // Step 1: Get Vercel token
    console.log('Step 1: Getting Vercel token...');
    const token = await question('Enter your Vercel token (get it from https://vercel.com/account/tokens): ');
    
    if (!token.trim()) {
      console.log('\n❌ Token required. Please get your token from:');
      console.log('https://vercel.com/account/tokens');
      console.log('Then run this script again.');
      return;
    }

    // Step 2: Get project ID
    console.log('\nStep 2: Getting project ID...');
    let projectId = 'tabby';
    
    try {
      // Try to get project info using Vercel CLI
      const projectInfo = execSync('vercel project ls --json', { encoding: 'utf8' });
      const projects = JSON.parse(projectInfo);
      const tabbyProject = projects.find(p => p.name === 'tabby');
      if (tabbyProject) {
        projectId = tabbyProject.id;
        console.log(`✅ Found project ID: ${projectId}`);
      }
    } catch (error) {
      console.log('⚠️  Could not auto-detect project ID, using "tabby"');
    }

    // Step 3: Create KV database
    console.log('\nStep 3: Creating KV database...');
    console.log('Please follow these steps:');
    console.log('1. Go to: https://vercel.com/dashboard');
    console.log('2. Click on your "tabby" project');
    console.log('3. Go to "Storage" tab');
    console.log('4. Click "Create Database"');
    console.log('5. Choose "KV" (Key-Value)');
    console.log('6. Name it: tabby-receipt-cache');
    console.log('7. Click "Create"');
    console.log('8. Click on the new database');
    console.log('9. Copy the "REST API URL" and "REST API Token"');
    
    const kvUrl = await question('\nEnter the KV REST API URL: ');
    const kvToken = await question('Enter the KV REST API Token: ');

    if (!kvUrl.trim() || !kvToken.trim()) {
      console.log('\n❌ Both URL and Token are required.');
      return;
    }

    // Step 4: Set environment variables
    console.log('\nStep 4: Setting environment variables...');
    
    try {
      // Set environment variables using Vercel CLI
      execSync(`vercel env add VERCEL_KV_REST_API_URL production`, { 
        input: kvUrl,
        stdio: 'pipe'
      });
      console.log('✅ Set VERCEL_KV_REST_API_URL');
      
      execSync(`vercel env add VERCEL_KV_REST_API_TOKEN production`, { 
        input: kvToken,
        stdio: 'pipe'
      });
      console.log('✅ Set VERCEL_KV_REST_API_TOKEN');
      
    } catch (error) {
      console.log('⚠️  Could not set environment variables automatically.');
      console.log('Please set them manually:');
      console.log('1. Go to: https://vercel.com/dashboard');
      console.log('2. Select your "tabby" project');
      console.log('3. Go to "Settings" → "Environment Variables"');
      console.log('4. Add these variables:');
      console.log(`   - VERCEL_KV_REST_API_URL: ${kvUrl}`);
      console.log(`   - VERCEL_KV_REST_API_TOKEN: ${kvToken}`);
    }

    // Step 5: Redeploy
    console.log('\nStep 5: Redeploying...');
    const shouldRedeploy = await question('Do you want to redeploy now? (y/n): ');
    
    if (shouldRedeploy.toLowerCase() === 'y') {
      try {
        console.log('🚀 Redeploying...');
        execSync('vercel --prod --yes', { stdio: 'inherit' });
        console.log('✅ Redeployment complete!');
      } catch (error) {
        console.log('⚠️  Redeployment failed. Please redeploy manually.');
      }
    }

    console.log('\n🎉 KV Setup Complete!');
    console.log('\n📊 Test the performance:');
    console.log('1. Go to your app: https://tabby-9swv45d64-peyton-doyle.vercel.app');
    console.log('2. Upload a receipt');
    console.log('3. Check the processing time');
    console.log('4. Upload the same receipt again (should be instant!)');
    console.log('\n🔍 Look for these headers in browser console:');
    console.log('- X-Cache-Type: KV (means KV is working)');
    console.log('- X-Cache-Type: memory (means fallback to in-memory)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

setupKV();
