#!/usr/bin/env node

/**
 * Create KV Database using Vercel API
 * This script will create a KV database and set up environment variables
 */

import readline from 'readline';
import https from 'https';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function createKV() {
  console.log('🗄️  Creating Vercel KV Database');
  console.log('===============================\n');

  try {
    // Get Vercel token
    const token = await question('Enter your Vercel token (get it from https://vercel.com/account/tokens): ');
    
    if (!token.trim()) {
      console.log('\n❌ Token required. Please get your token from:');
      console.log('https://vercel.com/account/tokens');
      return;
    }

    // Get team ID (optional)
    const teamId = await question('Enter your team ID (or press Enter to skip): ');

    // Create KV database
    console.log('\n🚀 Creating KV database...');
    
    const createData = {
      name: 'tabby-receipt-cache',
      type: 'kv'
    };

    const createOptions = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const createUrl = teamId.trim() 
      ? `https://api.vercel.com/v1/storage/kv?teamId=${teamId}`
      : 'https://api.vercel.com/v1/storage/kv';

    const createResult = await makeRequest(createUrl, createOptions, createData);
    
    if (createResult.status === 200 || createResult.status === 201) {
      console.log('✅ KV database created successfully!');
      
      const kvId = createResult.data.id;
      console.log(`📋 KV Database ID: ${kvId}`);
      
      // Get connection details
      console.log('\n🔑 Getting connection details...');
      
      const getOptions = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const getUrl = teamId.trim()
        ? `https://api.vercel.com/v1/storage/kv/${kvId}?teamId=${teamId}`
        : `https://api.vercel.com/v1/storage/kv/${kvId}`;

      const getResult = await makeRequest(getUrl, getOptions);
      
      if (getResult.status === 200) {
        const kvData = getResult.data;
        console.log('✅ Connection details retrieved!');
        console.log(`📋 REST API URL: ${kvData.restApiUrl}`);
        console.log(`📋 REST API Token: ${kvData.restApiToken}`);
        
        // Set environment variables
        console.log('\n🔧 Setting environment variables...');
        
        const projectId = 'tabby'; // You can change this if needed
        const envData = [
          {
            key: 'VERCEL_KV_REST_API_URL',
            value: kvData.restApiUrl,
            target: ['production']
          },
          {
            key: 'VERCEL_KV_REST_API_TOKEN',
            value: kvData.restApiToken,
            target: ['production']
          }
        ];

        for (const envVar of envData) {
          const envOptions = {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          };

          const envUrl = teamId.trim()
            ? `https://api.vercel.com/v1/projects/${projectId}/env?teamId=${teamId}`
            : `https://api.vercel.com/v1/projects/${projectId}/env`;

          const envResult = await makeRequest(envUrl, envOptions, envVar);
          
          if (envResult.status === 200 || envResult.status === 201) {
            console.log(`✅ Set ${envVar.key}`);
          } else {
            console.log(`⚠️  Could not set ${envVar.key}: ${envResult.status}`);
          }
        }

        console.log('\n🎉 KV setup complete!');
        console.log('\n📊 Next steps:');
        console.log('1. Redeploy your project');
        console.log('2. Test the performance');
        console.log('3. Check browser console for "X-Cache-Type: KV"');
        
      } else {
        console.log(`❌ Could not get connection details: ${getResult.status}`);
        console.log('Please set up environment variables manually:');
        console.log('1. Go to https://vercel.com/dashboard');
        console.log('2. Select your "tabby" project');
        console.log('3. Go to "Settings" → "Environment Variables"');
        console.log('4. Add the KV URL and Token');
      }
      
    } else {
      console.log(`❌ Could not create KV database: ${createResult.status}`);
      console.log('Please create it manually:');
      console.log('1. Go to https://vercel.com/dashboard');
      console.log('2. Select your "tabby" project');
      console.log('3. Go to "Storage" tab');
      console.log('4. Create a new KV database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

createKV();
