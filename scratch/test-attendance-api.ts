import axios from 'axios';

async function test() {
    const BASE_URL = 'http://localhost:3000/api/v1';
    const studentId = 'a4777360-006b-41b4-870f-23d897277144';
    
    try {
        console.log('Testing Statistics API...');
        const statsRes = await axios.get(`${BASE_URL}/attendance/student/${studentId}/stats`);
        console.log('Stats Response Structure:', JSON.stringify(statsRes.data, null, 2));

        console.log('\nTesting History API...');
        const historyRes = await axios.get(`${BASE_URL}/attendance?studentId=${studentId}&limit=30`);
        console.log('History Response Structure:', JSON.stringify(historyRes.data, null, 2));
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

test();
