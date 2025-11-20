# API Key Connection Troubleshooting Guide

## Issue: API Connection Fails When Clicking "Generate"

If you're experiencing API connection failures when generating charts on Railway, follow these steps:

---

## Step 1: Check Railway Environment Variables

1. Go to your Railway dashboard
2. Select your project
3. Click on the **Variables** tab
4. Verify that `API_KEY` is set and has a value

**Common Issues:**
- ❌ API_KEY is not set at all
- ❌ API_KEY has trailing/leading spaces
- ❌ API_KEY is set to a placeholder like "your_key_here"

---

## Step 2: Validate API Key Format

Google Gemini API keys should:
- ✅ Start with `AIzaSy`
- ✅ Be approximately 39 characters long
- ✅ Contain only alphanumeric characters and hyphens

**If your key doesn't match this format:**
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy it to Railway's environment variables

---

## Step 3: Run the Diagnostic Tool on Railway

I've added a diagnostic script to help identify the exact issue.

### Option A: Via Railway CLI
```bash
# SSH into your Railway deployment
railway run npm run diagnose
```

### Option B: Add Temporary Endpoint
You can also check the browser's Network tab:
1. Open your app in Railway
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Try to generate a chart
5. Look for the `/job/{jobId}` request
6. Check the response - it should show the error message

---

## Step 4: Check for Specific Error Messages

### Error: "API call failed with status: 400"
**Cause:** Invalid API key or malformed request
**Fix:**
1. Verify API key in Railway dashboard
2. Ensure no extra characters or spaces
3. Regenerate API key at https://aistudio.google.com/app/apikey

### Error: "API call failed with status: 403"
**Cause:** API key doesn't have permission
**Fix:**
1. Check that Gemini API is enabled in Google Cloud Console
2. Verify billing is set up (free tier works, but needs to be activated)
3. Check API key restrictions (should allow generativelanguage.googleapis.com)

### Error: "API call failed with status: 429"
**Cause:** Rate limit or quota exceeded
**Fix:**
1. Wait 1-2 minutes and try again
2. If persistent, check quota at https://aistudio.google.com/
3. Consider upgrading to paid tier for higher limits

### Error: "quota exceeded" or "RESOURCE_EXHAUSTED"
**Cause:** Free tier daily/monthly limit reached
**Fix:**
1. Wait until quota resets (usually daily)
2. Upgrade to paid tier at https://ai.google.dev/pricing
3. Check quota usage at https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

---

## Step 5: Check Browser Console for Client-Side Errors

1. Open your app in browser
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Try to generate a chart
5. Look for error messages in red

**Common client-side errors:**
- CORS errors → Railway environment variable issue
- Network errors → Server might be down
- Timeout errors → Request taking too long (increase timeout)

---

## Step 6: Verify Environment Variable Injection

On Railway, environment variables should be automatically injected. To verify:

1. Add a temporary logging endpoint (for testing only):
   ```javascript
   // In server.js, add:
   app.get('/check-env', (req, res) => {
     res.json({
       hasApiKey: !!process.env.API_KEY,
       keyLength: process.env.API_KEY?.length || 0,
       keyStart: process.env.API_KEY?.substring(0, 10) || 'NOT SET',
       nodeEnv: process.env.NODE_ENV
     });
   });
   ```

2. Visit `https://your-railway-url.up.railway.app/check-env`
3. Verify `hasApiKey: true` and `keyLength: 39`
4. **Remove this endpoint after testing** (security risk!)

---

## Step 7: Test with Minimal Request

Try generating a chart with minimal research to rule out content issues:

**Test Input:**
```
Prompt: Create a simple 3-month roadmap
Research: Phase 1: Planning (Month 1)
          Phase 2: Development (Month 2)
          Phase 3: Launch (Month 3)
```

If this works but larger requests fail:
- Issue is likely quota/timeout related
- Try reducing research file size
- Split large uploads into smaller batches

---

## Quick Checklist

- [ ] API_KEY is set in Railway environment variables
- [ ] API_KEY starts with "AIzaSy" and is ~39 characters
- [ ] API key was created at https://aistudio.google.com/app/apikey
- [ ] Gemini API is enabled in Google Cloud Console
- [ ] No recent error messages in Railway deployment logs
- [ ] Browser console shows no CORS or network errors
- [ ] Test request with minimal content works

---

## Still Having Issues?

If you've tried all the above:

1. **Check Railway Logs:**
   ```bash
   railway logs
   ```
   Look for error messages containing "API" or "Gemini"

2. **Regenerate API Key:**
   - Go to https://aistudio.google.com/app/apikey
   - Delete old key
   - Create new key
   - Update Railway environment variable
   - Restart deployment

3. **Contact Support:**
   - Google AI Studio: https://aistudio.google.com/
   - Railway: https://railway.app/help

---

## Diagnostic Script Output Reference

When you run `npm run diagnose`, you should see:

```
✅ API_KEY found
✅ API key format looks valid
✅ API response received
✅ SUCCESS: All tests passed!
```

If any step fails, follow the specific fix for that step.
