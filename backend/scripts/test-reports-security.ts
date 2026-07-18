import * as http from 'http';

// Helper to make POST request and return response data
function post(url: string, data: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const parsedUrl = new URL(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ statusCode: res.statusCode || 0, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, data: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

// Helper to make GET request with authorization token
function get(url: string, token?: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ statusCode: res.statusCode || 0, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, data: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function run() {
  console.log('=== STARTING SECURITY & AUTHORIZATION TESTS FOR UC-25 ===\n');

  let adminToken = '';
  let branchToken = '';
  let pharmacistToken = '';

  // 1. Authenticate users
  try {
    console.log('🔑 Loging in as Admin (admin@vinapharmacy.com)...');
    const adminRes = await post('http://localhost:4000/api/auth/login', {
      email: 'admin@vinapharmacy.com',
      password: '123456'
    });
    if ((adminRes.statusCode === 200 || adminRes.statusCode === 201) && adminRes.data?.access_token) {
      adminToken = adminRes.data.access_token;
      console.log('✅ Admin login success!');
    } else {
      console.error('❌ Admin login failed:', adminRes.statusCode, adminRes.data);
    }

    console.log('🔑 Loging in as Branch Manager CN1 (manager@vinapharmacy.com)...');
    const branchRes = await post('http://localhost:4000/api/auth/login', {
      email: 'manager@vinapharmacy.com',
      password: '123456'
    });
    if ((branchRes.statusCode === 200 || branchRes.statusCode === 201) && branchRes.data?.access_token) {
      branchToken = branchRes.data.access_token;
      console.log('✅ Branch Manager login success!');
    } else {
      console.error('❌ Branch Manager login failed:', branchRes.statusCode, branchRes.data);
    }

    console.log('🔑 Loging in as Pharmacist CN1 (pharmacist@vinapharmacy.com)...');
    const pharmRes = await post('http://localhost:4000/api/auth/login', {
      email: 'pharmacist@vinapharmacy.com',
      password: '123456'
    });
    if ((pharmRes.statusCode === 200 || pharmRes.statusCode === 201) && pharmRes.data?.access_token) {
      pharmacistToken = pharmRes.data.access_token;
      console.log('✅ Pharmacist login success!');
    } else {
      console.error('❌ Pharmacist login failed:', pharmRes.statusCode, pharmRes.data);
    }
  } catch (err) {
    console.error('❌ Authentication step failed:', err.message);
    process.exit(1);
  }

  console.log('\n--- RUNNING TEST CASES ---');

  // Test Case 1: No token (401 Unauthorized)
  try {
    console.log('\n[TC-1] Requesting dashboard summary without token...');
    const res = await get('http://localhost:4000/api/reports/dashboard/summary');
    console.log(`-> Status Code: ${res.statusCode} (Expected: 401)`);
    if (res.statusCode === 401) {
      console.log('🎉 PASS: Correctly blocked unauthorized request (401)');
    } else {
      console.error('❌ FAIL: Expected 401 but got', res.statusCode);
    }
  } catch (e) {
    console.error('Error during TC-1:', e.message);
  }

  // Test Case 2: Admin requests all branches (200 OK)
  if (adminToken) {
    try {
      console.log('\n[TC-2] Admin requests all branches (branchId=all)...');
      const res = await get('http://localhost:4000/api/reports/dashboard/summary?branchId=all', adminToken);
      console.log(`-> Status Code: ${res.statusCode} (Expected: 200)`);
      if (res.statusCode === 200) {
        console.log('🎉 PASS: Admin can see all branches dashboard summary');
        console.log('   Data structure check:', {
          netRevenue: res.data?.data?.revenue?.netRevenue,
          totalStock: res.data?.data?.inventory?.totalStock
        });
      } else {
        console.error('❌ FAIL: Expected 200 but got', res.statusCode, res.data);
      }
    } catch (e) {
      console.error('Error during TC-2:', e.message);
    }
  }

  // Test Case 3: Branch Manager requests their own branch (200 OK)
  if (branchToken) {
    try {
      console.log('\n[TC-3] Branch Manager CN1 requests BR-001 (their own branch)...');
      const res = await get('http://localhost:4000/api/reports/dashboard/summary?branchId=BR-001', branchToken);
      console.log(`-> Status Code: ${res.statusCode} (Expected: 200)`);
      if (res.statusCode === 200) {
        console.log('🎉 PASS: Branch manager allowed to access own branch data');
      } else {
        console.error('❌ FAIL: Expected 200 but got', res.statusCode, res.data);
      }
    } catch (e) {
      console.error('Error during TC-3:', e.message);
    }
  }

  // Test Case 4: Branch Manager requests all branches (403 Forbidden)
  if (branchToken) {
    try {
      console.log('\n[TC-4] Branch Manager CN1 requests all branches (branchId=all)...');
      const res = await get('http://localhost:4000/api/reports/dashboard/summary?branchId=all', branchToken);
      console.log(`-> Status Code: ${res.statusCode} (Expected: 403)`);
      if (res.statusCode === 403) {
        console.log('🎉 PASS: Branch manager correctly blocked from accessing whole chain data (403)');
      } else {
        console.error('❌ FAIL: Expected 403 but got', res.statusCode, res.data);
      }
    } catch (e) {
      console.error('Error during TC-4:', e.message);
    }
  }

  // Test Case 5: Branch Manager requests different branch (403 Forbidden)
  if (branchToken) {
    try {
      console.log('\n[TC-5] Branch Manager CN1 requests BR-002 (different branch)...');
      const res = await get('http://localhost:4000/api/reports/dashboard/summary?branchId=BR-002', branchToken);
      console.log(`-> Status Code: ${res.statusCode} (Expected: 403)`);
      if (res.statusCode === 403) {
        console.log('🎉 PASS: Branch manager correctly blocked from accessing other branch data (403)');
      } else {
        console.error('❌ FAIL: Expected 403 but got', res.statusCode, res.data);
      }
    } catch (e) {
      console.error('Error during TC-5:', e.message);
    }
  }

  // Test Case 6: Pharmacist requests own branch (200 OK)
  if (pharmacistToken) {
    try {
      console.log('\n[TC-6] Pharmacist CN1 requests BR-001 (their own branch)...');
      const res = await get('http://localhost:4000/api/reports/dashboard/summary?branchId=BR-001', pharmacistToken);
      console.log(`-> Status Code: ${res.statusCode} (Expected: 200)`);
      if (res.statusCode === 200) {
        console.log('🎉 PASS: Pharmacist allowed to access own branch data');
      } else {
        console.error('❌ FAIL: Expected 200 but got', res.statusCode, res.data);
      }
    } catch (e) {
      console.error('Error during TC-6:', e.message);
    }
  }

  // Test Case 7: Pharmacist requests all branches (403 Forbidden)
  if (pharmacistToken) {
    try {
      console.log('\n[TC-7] Pharmacist CN1 requests all branches (branchId=all)...');
      const res = await get('http://localhost:4000/api/reports/dashboard/summary?branchId=all', pharmacistToken);
      console.log(`-> Status Code: ${res.statusCode} (Expected: 403)`);
      if (res.statusCode === 403) {
        console.log('🎉 PASS: Pharmacist correctly blocked from accessing whole chain data (403)');
      } else {
        console.error('❌ FAIL: Expected 403 but got', res.statusCode, res.data);
      }
    } catch (e) {
      console.error('Error during TC-7:', e.message);
    }
  }

  console.log('\n=== SECURITY & AUTHORIZATION TESTS COMPLETED ===');
}

run();
