const { Client } = require('pg');

const poolerUrl = 'postgresql://postgres.eonetsffmkfdhoehtusa:Mehdy%4043173070@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const directUrl = 'postgresql://postgres:Mehdy%4043173070@db.eonetsffmkfdhoehtusa.supabase.co:5432/postgres';

async function testConnection(url, name) {
    console.log(`\nTesting ${name}:`);
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        console.log(`✅ Success connecting to ${name}`);
        const res = await client.query('SELECT 1 as result');
        console.log(`QueryResult:`, res.rows);
    } catch (e) {
        console.error(`❌ Failed to connect to ${name}:`, e.message);
    } finally {
        await client.end().catch(()=> { });
    }
}

async function main() {
    await testConnection(poolerUrl, 'Pooler');
    await testConnection(directUrl, 'Direct');
}

main();
