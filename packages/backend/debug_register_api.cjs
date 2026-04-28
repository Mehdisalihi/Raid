const http = require('http');

const data = JSON.stringify({
  name: 'Final Debug User',
  email: 'final' + Date.now() + '@example.com',
  password: 'password123',
  phone: '12345678'
});

const options = {
  hostname: '127.0.0.1',
  port: 5001,
  path: '/v1/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Response Body:', body);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
