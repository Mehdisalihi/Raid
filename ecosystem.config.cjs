module.exports = {
  apps: [
    {
      name: 'mohassibe-backend',
      cwd: './packages/backend',
      script: 'src/app.js',
      watch: true,
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      }
    },
    {
      name: 'mohassibe-web',
      cwd: './packages/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    }
  ]
};
