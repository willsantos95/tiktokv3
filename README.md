# TikTok Video Upload App - CSP Fix

## Changes Made

### Fix: Content Security Policy (CSP) Configuration

**File:** src/server.ts

**Problem:** Video preview was being blocked by CSP when using `data:` URLs with readAsDataURL()

**Solution:** Updated helmet configuration to allow data URLs for media:

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        mediaSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
```

## What This Fixes

- ✅ Video preview no longer blocked by CSP
- ✅ Video preview modal displays correctly
- ✅ User can see selected video before uploading

## Deployment

### Via EasyPanel
1. Extract ZIP
2. `npm run build`
3. `npm run start`

### Via GitHub
1. Upload files to branch `claude/tiktok-login-upload-specs-288tzf`
2. Redeploy from EasyPanel

## Environment Variables Required

```
NODE_ENV=production
APP_URL=https://vid.relampagodeofertas.shop
CORS_ORIGIN=https://vid.relampagodeofertas.shop
TIKTOK_CLIENT_KEY=sbawom3osgvtdcjh12
TIKTOK_CLIENT_SECRET=JC19bDo5UrBFpti0xLyIyXCxP5PHkYSM
TIKTOK_REDIRECT_URI=https://vid.relampagodeofertas.shop/api/v1/auth/callback
SESSION_SECRET=your_secret_here
```

## Files Modified

- src/server.ts: Updated helmet CSP configuration

## Version

v4.1 - CSP Fix
Date: 2026-08-11
