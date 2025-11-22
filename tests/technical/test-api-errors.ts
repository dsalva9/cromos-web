import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testApiErrors() {
  console.log('Starting API Error Handling Tests...\n');

  // Test 1: 404 Not Found
  try {
    console.log('Test 1: Requesting non-existent endpoint...');
    const response = await fetch(`${BASE_URL}/api/non-existent-endpoint`);
    
    if (response.status === 404) {
      console.log('✅ Success: Received 404 for non-existent endpoint');
    } else {
      console.log(`❌ Failed: Expected 404, got ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Failed: Network error during 404 test', error);
  }

  // Test 2: 500 Server Error (Simulated via bad request if possible, or just checking handling)
  // Since we can't easily force a 500 without a specific endpoint, we'll skip specific 500 generation 
  // unless we have an endpoint that errors on specific input.
  // For now, we verify the 404 handling which confirms the basic error path.

  console.log('\nAPI Tests Completed.');
}

testApiErrors();
