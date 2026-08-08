const axios = require('axios');

async function runTest() {
  const API_URL = 'http://localhost:5000/api/v1';
  try {
    console.log('1. Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, { username: 'admin' });
    const token = loginRes.data.data.token;
    console.log('Login successful. Token acquired.');

    console.log('\n2. Testing unprotected access (should fail)...');
    try {
      await axios.post(`${API_URL}/leads/create`, {
        name: 'Unprotected Test',
        phone: '1112223334'
      });
      console.log('❌ ERROR: Lead creation succeeded without token! Auth is broken.');
    } catch (err) {
      console.log(`✅ SUCCESS: Request rejected with status: ${err.response?.status} (${err.response?.data?.message})`);
    }

    console.log('\n3. Creating a test lead WITH token...');
    const createRes = await axios.post(`${API_URL}/leads/create`, {
      name: 'API Automation Test',
      phone: '9998887776',
      comments: 'Testing via API'
    }, { headers });
    const newLead = createRes.data.data;
    console.log(`Lead created! ID: ${newLead.id}, Name: ${newLead.name}`);

    console.log('\n3. Fetching leads to verify...');
    const leadsRes = await axios.post(`${API_URL}/leads/list`, { search: 'API Automation Test' }, { headers });
    console.log(`Found ${leadsRes.data.data.total} leads matching search.`);

    console.log('\n4. Fetching activities to verify logging...');
    const activitiesRes = await axios.post(`${API_URL}/leads/activities`, {}, { headers });
    const activities = activitiesRes.data.data.slice(0, 2);
    console.log('Latest activities:');
    activities.forEach(a => console.log(`- [${a.type}] ${a.content}`));

  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

runTest();
