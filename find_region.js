import pkg from 'pg';
const { Client } = pkg;

const regions = [
    "eu-west-3",    // Paris
    "eu-central-1", // Frankfurt
    "eu-west-1",    // Ireland
    "eu-west-2",    // London
];

const user = "postgres.rcbxuoddjvpoaiflwdkf";
const password = "Mehdy@2026";

async function findWorkingRegion() {
    for (const region of regions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        console.log(`Testing region: ${region} (${host})...`);
        const client = new Client({
            user: user,
            host: host,
            database: 'postgres',
            password: password,
            port: 6543,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await client.connect();
            console.log(`✅ SUCCESS! Working region is: ${region}`);
            await client.end();
            process.exit(0);
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }
    console.log('None of the regions worked.');
    process.exit(1);
}

findWorkingRegion();
