// Using built-in fetch
async function testRegistration() {
    try {
        const res = await fetch('http://localhost:5001/v1/auth/register', {            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: `test_${Date.now()}@example.com`,
                password: 'password123',
                phone: '1234567890'
            })
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (e) {
        console.error('Test Failed:', e.message);
    }
}

testRegistration();
