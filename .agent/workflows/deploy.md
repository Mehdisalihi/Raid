---
description: Deploy changes to GitHub and Vercel after every fix
---

// turbo-all

## Deploy Workflow

After every fix or change, run these steps to push to GitHub and deploy to Vercel.

### Step 1: Stage all changes
```
git add -A
```

### Step 2: Commit with a descriptive message
```
git commit -m "fix: apply latest fixes"
```

### Step 3: Push to GitHub (main branch)
```
git push origin main
```

### Step 4: Deploy backend to Vercel
```
npx vercel --prod --cwd packages/backend --yes
```

### Step 5: Confirm deployments were successful
```
npx vercel ls
```
