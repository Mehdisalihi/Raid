const http = require('http');

function request(path, method, body, token) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 5001,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                console.log(`\n=== ${method} ${path} ===`);
                console.log('Status:', res.statusCode);
                try {
                    const parsed = JSON.parse(data);
                    console.log('Response:', JSON.stringify(parsed, null, 2));
                    resolve(parsed);
                } catch {
                    console.log('Raw:', data);
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
    console.log('=== TESTING LOCAL BACKEND API ===\n');

    // 1. Test Registration to get a token
    console.log('--- Registering User ---');
    const reg = await request('/v1/auth/register', 'POST', {
        name: 'Local Test',
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        phone: '123456789'
    });

    if (reg && reg.token) {
        const token = reg.token;
        console.log('Login successful, token acquired.');

        // 2. Test POST supplier
        await request('/v1/suppliers', 'POST', {
            name: 'Local Supplier',
            phone: '999999',
            email: 'supp@example.com',
            company: 'Local Co'
        }, token);

        // 3. Test POST product
        await request('/v1/products', 'POST', {
            name: 'Local Product',
            barcode: '123456789',
            buyPrice: 100,
            sellPrice: 150,
            stockQty: 10,
            minStockAlert: 5
        }, token);

        // 4. Test POST customer
        await request('/v1/customers', 'POST', {
            name: 'Local Customer',
            phone: '888888',
            email: 'cust@example.com'
        }, token);

        // 5. Test PUT supplier
        const suppliers = await request('/v1/suppliers', 'GET', null, token);
        if (suppliers && Array.isArray(suppliers) && suppliers.length > 0) {
            const id = suppliers[0].id;
            await request(`/v1/suppliers/${id}`, 'PUT', {
                name: 'Updated Supplier',
                phone: '777777',
                email: 'upd@example.com',
                company: 'Updated Co'
            }, token);
        }

    } else {
        console.error('Registration failed, cannot test authenticated routes.');
    }

    console.log('\n=== ALL LOCAL TESTS DONE ===');
})();
