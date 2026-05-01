import pkg from 'pg';
const { Client } = pkg;

const user = "postgres";
const host = "13.39.9.193"; // Direct Paris Pooler IPv4
const password = "Mehdy@2026";
const projectRef = "rcbxuoddjvpoaiflwdkf";

async function testWithEndpoint() {
    console.log(`Testing connection to IP ${host} with endpoint ${projectRef}...`);
    const client = new Client({
        user: `${user}.${projectRef}`,
        host: host,
        database: 'postgres',
        password: password,
        port: 6543,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log(`✅ SUCCESS! It worked with user: ${user}.${projectRef}`);
        await client.end();
        process.exit(0);
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        process.exit(1);
    }
}

testWithEndpoint();
