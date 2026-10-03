---
description: Deploy changes to GitHub and Vercel after every fix
---

# Deploy Workflow

After every fix or change, run the following steps in order:

// turbo-all

1. Stage and commit all changes (from `packages/web`):

```bash
git add -A && git commit -m "fix: <describe fix here>"
```

Run from: `c:\Users\pc\mohassibe\packages\web`

1. Push to GitHub:

```bash
git push
```

Run from: `c:\Users\pc\mohassibe\packages\web`

1. Deploy to Vercel production:

```bash
vercel --prod --yes
```

Run from: `c:\Users\pc\mohassibe\packages\web`
