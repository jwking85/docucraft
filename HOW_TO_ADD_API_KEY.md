# 🔑 How to Add Your Google AI Studio API Key to DocuCraft

## 🎯 3 Easy Ways to Add Your API Key

---

## ✨ **Method 1: In-App Settings Panel** (Easiest!)

### Step 1: Open Settings
1. Launch DocuCraft
2. Look for the **Settings icon** (⚙️) in the top-right corner
3. Click it to open the Settings Panel

### Step 2: Enter Your API Keys
1. **Google AI Studio API Key** (Required)
   - Click "Get API Key" link → Opens [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - Create/copy your API key
   - Paste into the field
   - Click "Test" to verify it works

2. **Pexels API Key** (Optional - for better images)
   - Click "Get API Key" link → Opens [https://www.pexels.com/api/new/](https://www.pexels.com/api/new/)
   - Free tier: 200 requests/hour
   - Paste into the field

3. **Access Code** (Optional - password protection)
   - Set a password to lock DocuCraft

### Step 3: Save
- Click "Save Settings"
- Refresh the page to apply changes
- You're done! ✅

**Pros:**
- ✅ Easy visual interface
- ✅ Test button to verify key works
- ✅ Links to get API keys
- ✅ Secure (stored in browser localStorage)

**Cons:**
- ⚠️ Keys stored locally (not in source code)
- ⚠️ Need to re-enter if you clear browser data

---

## 📝 **Method 2: Edit .env.local File** (Recommended for Development)

### Step 1: Locate the File
```
DocuCraft/
└── .env.local  ← This file
```

### Step 2: Edit the File
Open `.env.local` in any text editor and update:

```env
GEMINI_API_KEY=YOUR_API_KEY_HERE
ACCESS_CODE=your_password_here
PEXELS_API_KEY=your_pexels_key_here  # Optional
REPLICATE_API_KEY=your_replicate_key  # Optional
```

### Step 3: Get Your API Keys

#### Google AI Studio (Required)
1. Go to: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Select a Google Cloud project (or create one)
4. Copy the key (starts with `AIzaSy...`)
5. Paste into `.env.local`:
   ```env
   GEMINI_API_KEY=AIzaSyAd0u8xW3wdGERrah9v3PIxfdBoLVDblNU
   ```

#### Pexels (Optional - Free)
1. Go to: [https://www.pexels.com/api/new/](https://www.pexels.com/api/new/)
2. Sign up (free)
3. Copy your API key
4. Paste into `.env.local`:
   ```env
   PEXELS_API_KEY=rnbyBaGQ1EZPwtsoJjqi3sdBIdli3Yvt2uVhPMtaY9Dj7zhzYh9Ob6cb
   ```

### Step 4: Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Start again
npm run dev
```

**Pros:**
- ✅ Persists across browser clears
- ✅ Secure (not committed to git)
- ✅ Works in development

**Cons:**
- ⚠️ Need to edit file manually
- ⚠️ Need to restart server

---

## 🚀 **Method 3: Environment Variables** (For Production Deployment)

### For Netlify
1. Go to your site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add these variables:
   ```
   GEMINI_API_KEY = your_key_here
   PEXELS_API_KEY = your_pexels_key (optional)
   ACCESS_CODE = your_password (optional)
   ```
4. Redeploy your site

### For Vercel
1. Go to your project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the same variables as above
4. Redeploy

### For Other Hosting
Check your platform's documentation for adding environment variables.

**Pros:**
- ✅ Most secure
- ✅ Different keys per environment (dev/staging/production)
- ✅ Team-friendly

**Cons:**
- ⚠️ Requires redeployment to change

---

## 🔍 **How to Get a Google AI Studio API Key**

### Detailed Steps:

1. **Visit Google AI Studio**
   - Go to: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - Sign in with your Google account

2. **Create API Key**
   - Click "Create API Key" button
   - Choose existing Google Cloud project OR create new one
   - Wait for key generation (takes ~10 seconds)

3. **Copy Your Key**
   - Key format: `AIzaSy...` (long alphanumeric string)
   - Click copy icon
   - Store safely (you can always retrieve it later)

4. **Enable Required APIs** (Usually automatic)
   - Gemini API
   - Generative Language API

5. **Set Usage Limits** (Optional but recommended)
   - Go to Google Cloud Console
   - Set daily/monthly quotas to avoid surprise bills
   - Free tier: 60 requests/minute

### Free Tier Limits:
- **Gemini 2.0 Flash**: 15 RPM (requests per minute)
- **Gemini 1.5 Flash**: 15 RPM
- **Gemini 1.5 Pro**: 2 RPM
- **Text-to-Speech**: 60 RPM

**Plenty for personal use!**

---

## ✅ **Verify Your API Key Works**

### In-App Test (Method 1)
1. Open Settings Panel
2. Enter API key
3. Click "Test" button
4. Should see: "✅ API key is valid and working!"

### Manual Test
```javascript
// Open browser console (F12)
// Paste this code:

const testKey = async () => {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: 'YOUR_KEY_HERE' });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: { parts: [{ text: 'Say hello' }] }
  });
  console.log(response.text);
};

testKey();
```

If you see "Hello" or similar response → ✅ Key works!

---

## 🛡️ **Security Best Practices**

### ✅ DO:
- Store keys in `.env.local` (gitignored)
- Use environment variables in production
- Set API usage quotas
- Regenerate keys if exposed

### ❌ DON'T:
- Commit `.env.local` to git
- Share keys publicly
- Hardcode keys in source code
- Use production keys in development

---

## 🐛 **Troubleshooting**

### "API Key Invalid" Error
**Solutions:**
1. Check for typos (keys are long!)
2. Ensure no extra spaces before/after
3. Verify key hasn't been deleted in AI Studio
4. Check API is enabled in Google Cloud

### "Permission Denied" Error
**Solutions:**
1. Enable Generative Language API in Google Cloud Console
2. Check billing is enabled (even for free tier)
3. Wait 5-10 minutes after creating key

### "Quota Exceeded" Error
**Solutions:**
1. Wait for quota reset (resets every minute/day)
2. Upgrade to paid tier
3. Use lower-tier model (Flash instead of Pro)

### Key Not Working After Adding
**Solutions:**
1. Refresh the page (for in-app settings)
2. Restart dev server (for .env.local)
3. Redeploy (for production)
4. Check browser console for errors

---

## 📊 **Which API Keys Do You Need?**

| API Key | Required? | Purpose | Free Tier |
|---------|-----------|---------|-----------|
| **Google AI Studio** | ✅ Yes | Script analysis, AI generation, captions | 15 RPM |
| **Pexels** | ⚠️ Optional | Better stock photo matching | 200/hour |
| **Replicate** | ❌ No | Advanced AI features (not used yet) | Limited |

**Minimum**: Just Google AI Studio key for full functionality!

---

## 🎉 **You're All Set!**

Once you've added your Google AI Studio API key using any method above, you can:

1. ✅ Generate AI voiceovers
2. ✅ Analyze scripts into scenes
3. ✅ Generate/match images
4. ✅ Create auto-captions
5. ✅ Get AI recommendations
6. ✅ Use all homerun features!

**Enjoy creating professional documentaries!** 🎬✨

---

## 📞 **Need Help?**

- **Google AI Studio Docs**: [https://ai.google.dev/](https://ai.google.dev/)
- **Pexels API Docs**: [https://www.pexels.com/api/documentation/](https://www.pexels.com/api/documentation/)
- **DocuCraft Issues**: [GitHub Issues](https://github.com/jwking85/docucraft/issues)

---

**Quick Recap:**
1. Easiest: Use Settings Panel (⚙️ icon)
2. Development: Edit `.env.local`
3. Production: Environment variables on hosting platform

Choose whichever method works best for you! 🚀
