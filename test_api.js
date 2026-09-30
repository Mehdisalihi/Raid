const https = require('https');

function request(path, method, body, token) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'backend-dedamed222s-projects.vercel.app',
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                console.log(`\n=== ${method} ${path} ===`);
                console.log('Status:', res.statusCode);
                try {
                    const parsed = JSON.parse(data);
                    console.log('Response:', JSON.stringify(parsed, null, 2).substring(0, 800));
                    resolve(parsed);
                } catch {
                    console.log('Raw:', data.substring(0, 500));
                    resolve(null);
                }
            });
        });
        req.on('error', (e) => {
            console.error(`Error:`, e.message);
            resolve(null);
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

(async () => {
    // Step 1: Login with real credentials from the .env
    // We need a real user. Let's try to register or use existing
    console.log('=== TESTING BACKEND API ===\n');
    
    // Test GET suppliers without auth
    await request('/v1/suppliers', 'GET');
    
    // Test POST supplier without auth (should fail with 401)
    const postNoAuth = await request('/v1/suppliers', 'POST', {
        name: 'TestSupplier', phone: '123', email: '', company: 'TestCo'
    });
    
    // Test POST supplier with fake token
    const postFakeAuth = await request('/v1/suppliers', 'POST', {
        name: 'TestSupplier', phone: '123', email: '', company: 'TestCo'
    }, 'fake_token');

    // Test creating a customer (to see if the same error occurs)
    const postCustomerNoAuth = await request('/v1/customers', 'POST', {
        name: 'TestCustomer', phone: '456', email: ''
    });

    // Test creating a product
    const postProductNoAuth = await request('/v1/products', 'POST', {
        name: 'TestProduct', buyPrice: 100, sellPrice: 150, stockQty: 10
    });

    console.log('\n=== ALL TESTS DONE ===');
})();
