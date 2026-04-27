const { execSync } = require('child_process');
const regions = ['eu-west-3', 'eu-west-1', 'eu-central-1', 'eu-west-2', 'us-east-1'];
for (const region of regions) {
  const url = `postgresql://postgres.rcbxuoddjvpoaiflwdkf:Mehdy%4043173070@aws-0-${region}.pooler.supabase.com:5432/postgres`;
  try {
    console.log('Testing ' + region + '...');
    execSync('npx prisma db pull --schema=prisma/schema.prisma', { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
    console.log('SUCCESS: ' + region);
    process.exit(0);
  } catch (e) {
    if (!e.stderr.toString().includes('ENOTFOUND')) {
       console.log('Got different error for ' + region + ': ' + e.stderr.toString());
    }
  }
}
