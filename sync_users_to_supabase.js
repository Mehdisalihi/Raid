import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, 'packages/backend/.env') });

const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function syncUsers() {
    console.log('Reading users from local Prisma DB...');
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users locally.`);

    for (const user of users) {
        console.log(`Syncing user: ${user.email}...`);
        const { error } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                username: user.name,
                email: user.email,
                password_hash: user.passwordHash,
                role: user.role.toLowerCase(),
                status: user.isActive ? 'active' : 'suspended',
                created_at: user.createdAt
            });
        
        if (error) {
            console.error(`Failed to sync ${user.email}:`, error.message);
        } else {
            console.log(`Successfully synced ${user.email}`);
        }
    }

    console.log('Sync completed.');
    process.exit(0);
}

syncUsers().catch(err => {
    console.error('Fatal sync error:', err);
    process.exit(1);
});
