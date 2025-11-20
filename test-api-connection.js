/**
 * API Connection Diagnostic Tool
 * Tests the Gemini API connection and validates the API key
 */

import 'dotenv/config';

const API_KEY = process.env.API_KEY;
const MODEL = 'gemini-2.5-flash-preview-09-2025';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

console.log('🔍 API Connection Diagnostic Tool');
console.log('=================================\n');

// Step 1: Check if API key exists
console.log('Step 1: Checking API key...');
if (!API_KEY) {
  console.error('❌ FAILED: API_KEY environment variable is not set');
  console.error('   Railway users: Check that API_KEY is set in your Railway dashboard');
  console.error('   Local users: Create a .env file with API_KEY=your_key');
  process.exit(1);
}

console.log('✅ API_KEY found');
console.log(`   Length: ${API_KEY.length} characters`);
console.log(`   First 10 chars: ${API_KEY.substring(0, 10)}...`);
console.log(`   Last 4 chars: ...${API_KEY.substring(API_KEY.length - 4)}`);

// Step 2: Validate API key format
console.log('\nStep 2: Validating API key format...');
if (API_KEY.length < 10) {
  console.error('❌ FAILED: API key is too short (should be ~39 characters)');
  process.exit(1);
}

if (!API_KEY.startsWith('AIzaSy')) {
  console.warn('⚠️  WARNING: API key doesn\'t start with "AIzaSy"');
  console.warn('   Google API keys typically start with "AIzaSy"');
  console.warn('   Your key might be invalid or from a different service');
}

console.log('✅ API key format looks valid');

// Step 3: Test API connection
console.log('\nStep 3: Testing API connection...');
console.log(`   Endpoint: ${API_URL.replace(API_KEY, 'HIDDEN')}`);

const testPayload = {
  contents: [{
    parts: [{
      text: 'Say "Hello, API is working!" if you can read this.'
    }]
  }],
  generationConfig: {
    temperature: 0,
    maxOutputTokens: 100
  }
};

try {
  console.log('   Sending test request...');
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
  });

  console.log(`   Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('\n❌ FAILED: API request failed');
    console.error(`   Status: ${response.status}`);
    console.error(`   Error: ${errorText}`);

    if (response.status === 400) {
      console.error('\n💡 Possible causes:');
      console.error('   - API key is invalid or malformed');
      console.error('   - API key doesn\'t have access to Gemini API');
      console.error('   - Model name is incorrect');
    } else if (response.status === 403) {
      console.error('\n💡 Possible causes:');
      console.error('   - API key is valid but doesn\'t have permission');
      console.error('   - Gemini API is not enabled in your Google Cloud project');
      console.error('   - Billing is not set up (free tier should work)');
    } else if (response.status === 429) {
      console.error('\n💡 Possible causes:');
      console.error('   - Rate limit exceeded (too many requests)');
      console.error('   - Quota exhausted (free tier limit reached)');
    }

    process.exit(1);
  }

  const result = await response.json();

  // Step 4: Validate response
  console.log('\nStep 4: Validating API response...');

  if (!result.candidates || !result.candidates[0]) {
    console.error('❌ FAILED: Invalid response structure');
    console.error('   Response:', JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const responseText = result.candidates[0].content.parts[0].text;
  console.log('✅ API response received');
  console.log(`   Response: "${responseText}"`);

  // Check safety ratings
  if (result.candidates[0].safetyRatings) {
    const blocked = result.candidates[0].safetyRatings.find(r => r.blocked);
    if (blocked) {
      console.warn('⚠️  WARNING: Content was blocked by safety filters');
      console.warn(`   Category: ${blocked.category}`);
    }
  }

  console.log('\n✅ SUCCESS: All tests passed!');
  console.log('   Your API key is working correctly');
  console.log('   The application should be able to connect to Gemini API');

} catch (error) {
  console.error('\n❌ FAILED: Network or connection error');
  console.error(`   Error: ${error.message}`);
  console.error(`   Stack: ${error.stack}`);

  console.error('\n💡 Possible causes:');
  console.error('   - No internet connection');
  console.error('   - Firewall blocking outbound HTTPS requests');
  console.error('   - DNS resolution issues');
  console.error('   - Railway deployment network issues');

  process.exit(1);
}
