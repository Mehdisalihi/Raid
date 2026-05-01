import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres.eonetsffmkfdhoehtusa:Mehdy%4043173070@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

async function testConnection() {
    const client = new Client({
        connectionString: connectionString,
    });
    try {
        console.log('Attempting to connect to Supabase...');
        await client.connect();
        console.log('Successfully connected!');
        const res = await client.query('SELECT NOW()');
        console.log('Current time from DB:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection error details:', err.message);
    }
}

testConnection();
