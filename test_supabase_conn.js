import pkg from 'pg';
const { Client } = pkg;

const connectionString = "postgresql://postgres:Mehdy%402026@db.eonetsffmkfdhoehtusa.supabase.co:5432/postgres";

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
        if (err.message.includes('password authentication failed')) {
            console.log('--> ERROR: The password might be incorrect.');
        } else if (err.message.includes('ETIMEDOUT') || err.message.includes('ENOTFOUND')) {
            console.log('--> ERROR: Could not reach the host. Check if DB is paused or host is correct.');
        }
    }
}

testConnection();
