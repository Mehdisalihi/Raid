const { Client } = require('pg');

const testUrls = [
    'postgresql://postgres.rcbxuoddjvpoaiflwdkf:Mehdy%4043173070@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
];

async function testConnection(url) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        console.log(`✅ Success connecting to: ${url}`);
        const res = await client.query('SELECT 1 as result');
        return true;
    } catch (e) {
        console.error(`❌ Failed: ${url.substring(0, 50)}... ${e.message}`);
        return false;
    } finally {
        await client.end().catch(()=> { });
    }
}

async function main() {
    for (const url of testUrls) {
        const success = await testConnection(url);
        if (success) break;
    }
}

main();
