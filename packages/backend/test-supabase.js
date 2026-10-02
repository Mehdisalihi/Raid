import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
    console.log('Testing Supabase Auth...');
    
    const testEmail = `test_${Date.now()}@example.com`;
    console.log(`Attempting to sign up with: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!',
    });
    
    if (error) {
        console.error('Supabase Auth Error:', error.message, error.status);
    } else {
        console.log('Success! Supabase user created:', data.user?.id);
        
        // Cleanup the test user if possible, though free tier doesn't always allow this easily via anon key
        console.log('Note: Test user created successfully in Supabase.');
    }
}

testSupabase();
