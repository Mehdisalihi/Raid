const { execSync } = require('child_process');
const regions = [
  'eu-west-3', 'eu-west-1', 'eu-central-1', 'eu-west-2',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-south-1', 'ap-southeast-1', 'ap-northeast-1', 'sa-east-1', 'ca-central-1'
];
for (const region of regions) {
  console.log('Testing ' + region + '...');
  const url = `postgresql://postgres.rcbxuoddjvpoaiflwdkf:Mehdy%4043173070@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  try {
    execSync('npx prisma db pull --schema=prisma/schema.prisma', {
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'ignore'
    });
    console.log('SUCCESS: ' + region);
    process.exit(0);
  } catch (e) {
    // Failed, try next
  }
}
console.log('ALL FAILED');
