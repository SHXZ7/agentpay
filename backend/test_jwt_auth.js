// backend/test_jwt_auth.js - Test End-to-End JWT Auth & Profile Isolation
import http from 'http';

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting End-to-End JWT Auth & Profile Isolation Tests...\n');

  // Test 1: Send OTP
  console.log('Test 1: POST /api/auth/send-otp');
  const otpRes = await makeRequest('/api/auth/send-otp', 'POST', { identifier: 'alex@agentic.commerce' });
  console.log('  Status:', otpRes.status);
  console.log('  Response:', otpRes.data);
  if (otpRes.status !== 200 || !otpRes.data.success) {
    throw new Error('Test 1 Failed: Could not send OTP');
  }
  console.log('  ✅ OTP sent successfully.\n');

  // Test 2: Login / Authenticate User 1 (Alex Rivera)
  console.log('Test 2: POST /api/auth/login (User 1: Alex Rivera)');
  const loginRes1 = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'alex@agentic.commerce',
    otp: '1234',
    name: 'Alex Rivera',
    upi_vpa: 'alex@okaxis'
  });
  console.log('  Status:', loginRes1.status);
  console.log('  Token issued:', loginRes1.data.token ? `${loginRes1.data.token.substring(0, 30)}...` : 'NONE');
  console.log('  User profile:', loginRes1.data.user?.name, `(${loginRes1.data.user?.email})`);
  const token1 = loginRes1.data.token;
  if (!token1 || loginRes1.data.user?.name !== 'Alex Rivera') {
    throw new Error('Test 2 Failed: Token or user profile mismatch');
  }
  console.log('  ✅ User 1 logged in and JWT issued.\n');

  // Test 3: Verify GET /api/auth/me for User 1
  console.log('Test 3: GET /api/auth/me with User 1 Bearer Token');
  const meRes1 = await makeRequest('/api/auth/me', 'GET', null, token1);
  console.log('  Status:', meRes1.status);
  console.log('  Logged In User:', meRes1.data.user?.name, 'UPI:', meRes1.data.user?.upi_vpa);
  if (meRes1.data.user?.email !== 'alex@agentic.commerce') {
    throw new Error('Test 3 Failed: GET /api/auth/me did not return User 1');
  }
  console.log('  ✅ User 1 identity verified via JWT token.\n');

  // Test 4: Login / Authenticate User 2 (Priya Sharma)
  console.log('Test 4: POST /api/auth/login (User 2: Priya Sharma)');
  const loginRes2 = await makeRequest('/api/auth/login', 'POST', {
    identifier: 'priya@agentic.commerce',
    otp: '1234',
    name: 'Priya Sharma',
    upi_vpa: 'priya@okhdfcbank'
  });
  const token2 = loginRes2.data.token;
  console.log('  Status:', loginRes2.status);
  console.log('  User 2 profile:', loginRes2.data.user?.name, `(${loginRes2.data.user?.email})`);
  if (!token2 || loginRes2.data.user?.name !== 'Priya Sharma') {
    throw new Error('Test 4 Failed: Token or user profile mismatch for User 2');
  }
  console.log('  ✅ User 2 logged in and distinct JWT issued.\n');

  // Test 5: Verify Isolation: GET /api/auth/me with User 2 Bearer Token
  console.log('Test 5: GET /api/auth/me with User 2 Bearer Token (Isolation Check)');
  const meRes2 = await makeRequest('/api/auth/me', 'GET', null, token2);
  console.log('  Logged In User:', meRes2.data.user?.name, 'Email:', meRes2.data.user?.email);
  if (meRes2.data.user?.name !== 'Priya Sharma' || meRes2.data.user?.email !== 'priya@agentic.commerce') {
    throw new Error('Test 5 Failed: User 2 profile collided with User 1');
  }
  console.log('  ✅ User profiles strictly isolated.\n');

  // Test 6: Update User 2 Profile via POST /profile
  console.log('Test 6: POST /profile (Update Priya budget to ₹4500)');
  const originalPriyaBudget = meRes2.data.user?.default_max_budget || 2000;
  const originalPriyaVpa = meRes2.data.user?.upi_vpa || 'priya@okhdfcbank';
  try {
    const updateRes = await makeRequest('/profile', 'POST', {
      default_max_budget: 4500,
      upi_vpa: 'priya.vip@okhdfcbank'
    }, token2);
    console.log('  Status:', updateRes.status);
    console.log('  Updated User 2 Budget:', updateRes.data.profile?.default_max_budget, 'UPI:', updateRes.data.profile?.upi_vpa);
    if (updateRes.status !== 200 || updateRes.data.profile?.default_max_budget !== 4500 || updateRes.data.profile?.upi_vpa !== 'priya.vip@okhdfcbank') {
      throw new Error('Test 6 Failed: Profile update failed');
    }
    console.log('  ✅ User 2 profile updated in database.\n');

    // Test 7: Verify User 1 was NOT affected by User 2's update
    console.log('Test 7: Cross-Check User 1 Profile (Isolation Re-verification)');
    const meRes1Again = await makeRequest('/api/auth/me', 'GET', null, token1);
    console.log('  User 1 Name:', meRes1Again.data.user?.name);
    console.log('  User 1 UPI:', meRes1Again.data.user?.upi_vpa);
    console.log('  User 1 Budget:', meRes1Again.data.user?.default_max_budget);
    if (meRes1Again.data.user?.name !== 'Alex Rivera' || meRes1Again.data.user?.upi_vpa !== 'alex@okaxis') {
      throw new Error('Test 7 Failed: User 1 data corrupted by User 2');
    }
    console.log('  ✅ User 1 completely unaffected by User 2 changes.\n');
  } finally {
    // Restore Priya's original budget and UPI VPA to prevent state leakage
    await makeRequest('/profile', 'POST', {
      default_max_budget: originalPriyaBudget,
      upi_vpa: originalPriyaVpa
    }, token2);
  }

  // Test 8: Tampered Token Check
  console.log('Test 8: Tampered JWT Token Verification');
  const tamperedToken = token1.slice(0, -5) + 'XXXXX';
  const tamperedRes = await makeRequest('/api/auth/me', 'GET', null, tamperedToken);
  console.log('  Tampered token response authenticated status:', tamperedRes.data.authenticated);
  if (tamperedRes.data.authenticated === true) {
    throw new Error('Test 8 Failed: Tampered token was accepted!');
  }
  console.log('  ✅ Tampered token rejected securely.\n');

  console.log('🎉 ALL 8 JWT AUTH & ISOLATION TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
