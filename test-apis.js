const baseUrl = "https://nirmaya-v2.vercel.app";

const credentials = {
  phone: "+910000000000",
  password: "TestPassword123!"
};

const protectedEndpoints = [
  { path: "/api/auth/verify", method: "GET", expectedStatus: 200 },
  { path: "/api/patients", method: "GET", expectedStatus: 200 },
  { path: "/api/treatments", method: "GET", expectedStatus: 200 },
  { path: "/api/visits", method: "GET", expectedStatus: 200 },
  { path: "/api/transactions", method: "GET", expectedStatus: 200 },
  { path: "/api/installments", method: "GET", expectedStatus: 200 },
  { path: "/api/documents", method: "GET", expectedStatus: 200 },
  { path: "/api/followups", method: "GET", expectedStatus: 200 },
  { path: "/api/bills", method: "GET", expectedStatus: 200 },
  { path: "/api/audit-logs", method: "GET", expectedStatus: 200 }
];

async function runCompleteFlow() {
  console.log(`[1] Logging in at ${baseUrl}/api/auth/login...`);
  let token = null;
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials)
    });
    
    if (!res.ok) {
      console.log(`❌ Login failed with status: ${res.status}`);
      const text = await res.text();
      console.log(`Response: ${text}`);
      return;
    }

    const data = await res.json();
    if (data.success && data.data && data.data.token) {
      token = data.data.token;
      console.log(`✅ Login successful! Token retrieved.`);
    } else {
      console.log(`❌ Login failed, unexpected response structure:`, data);
      return;
    }
  } catch (err) {
    console.log(`❌ Error during login: ${err.message}`);
    return;
  }

  console.log(`\n[2] Testing protected endpoints using auth token...`);
  let passed = 0;
  for (const ep of protectedEndpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.text();
      
      if (res.status === ep.expectedStatus || res.status === 200) {
        console.log(`✅ [PASS] ${ep.method} ${ep.path} -> ${res.status}`);
        passed++;
      } else {
        console.log(`❌ [FAIL] ${ep.method} ${ep.path} -> Expected ${ep.expectedStatus}, got ${res.status}`);
        console.log(`   Response: ${data}`);
      }
    } catch (err) {
      console.log(`❌ [ERROR] ${ep.method} ${ep.path} -> ${err.message}`);
    }
  }

  console.log(`\nResults: ${passed}/${protectedEndpoints.length} protected endpoints passed.`);
}

runCompleteFlow();
