import pkg from 'pg';
const { Client } = pkg;

const users = [
    "postgres.rcbxuoddjvpoaiflwdkf",
    "rcbxuoddjvpoaiflwdkf",
    "postgres",
];

const host = "13.39.9.193"; // Direct Paris Pooler IPv4
const password = "Mehdy@2026";

async function findWorkingCombo() {
    for (const user of users) {
        console.log(`Testing user: ${user}...`);
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
            console.log(`✅ SUCCESS! Working user is: ${user}`);
            await client.end();
            process.exit(0);
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }
    console.log('None of the combinations worked.');
    process.exit(1);
}

findWorkingCombo();
