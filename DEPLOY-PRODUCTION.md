# 🚀 Deploy to Production (Live on Internet)

This guide walks you through deploying your Maison Veil shop **live and secure** using [Render.com](https://render.com) (recommended) or alternatives.

---

## **Option 1: Render.com (Easiest & Free Tier Available)**

### Prerequisites
- GitHub account (free at [github.com](https://github.com))
- Render account (free at [render.com](https://render.com))

### Step 1: Push Code to GitHub

1. Go to [github.com](https://github.com) and sign up (or log in)
2. Create a new repository:
   - Click **+** icon (top right) → "New repository"
   - Name: `dress-shop-live`
   - Description: "Maison Veil E-Commerce"
   - Choose **Public** (free) or **Private** (paid)
   - Click "Create repository"

3. **Upload your code:**
   - Open Command Prompt/Terminal on your computer
   - Navigate to your project:
     ```bash
     cd C:\Users\YourName\Desktop\dress-shop-fullstack
     ```
   - Initialize git:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR-USERNAME/dress-shop-live.git
     git push -u origin main
     ```
   - Replace `YOUR-USERNAME` with your actual GitHub username

### Step 2: Deploy to Render

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account:
   - Settings → GitHub → "Connect account"
   - Authorize Render to access your repos

3. Create a new Web Service:
   - Dashboard → "New" → "Web Service"
   - Select your `dress-shop-live` repository
   - Click "Connect"

4. Configure the deployment:
   - **Name:** `maison-veil` (or your shop name)
   - **Environment:** Node
   - **Build Command:** 
     ```
     cd backend && npm install
     ```
   - **Start Command:**
     ```
     cd backend && npm start
     ```
   - **Plan:** Free (or paid if you want more power)

5. Add environment variables:
   - Scroll down to "Environment"
   - Click "Add Environment Variable"
   - Add these:

     | Key | Value |
     |-----|-------|
     | `PORT` | `5000` |
     | `JWT_SECRET` | `your-super-random-secret-key-min-32-chars` |
     | `ADMIN_PASSWORD` | `your-very-secure-password-change-this` |
     | `NODE_ENV` | `production` |

   **Generate strong secrets:**
   - Go to [1password.com/password-generator](https://1password.com/password-generator)
   - Generate 2 strong passwords (32+ characters)
   - Copy them to the env variables above

6. Click "Create Web Service"

**Done!** Render will automatically deploy. Wait 3-5 minutes for it to build.

You'll get a URL like: `https://maison-veil.onrender.com`

**Your shop is now live!** 🎉

---

## **Option 2: Railway.app (Also Easy, Generous Free Tier)**

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Create new project → "Deploy from GitHub repo"
3. Select your `dress-shop-live` repository
4. Go to **Variables** tab, add:
   - `JWT_SECRET`: your-secret-key
   - `ADMIN_PASSWORD`: your-password
   - `NODE_ENV`: production

5. Railway auto-deploys on every push

Your URL: `https://yourdomain-production.up.railway.app`

---

## **Option 3: Heroku (Classic, Paid After Free Dyno Hours End)**

1. Sign up at [heroku.com](https://heroku.com)
2. Create app → connect GitHub → deploy
3. Add Procfile to your root directory:
   ```
   web: cd backend && npm start
   ```
4. Config vars (same as above)

---

## **Security Checklist ✅**

Before going live:

- [ ] Changed `ADMIN_PASSWORD` to something VERY secure
- [ ] Generated a strong `JWT_SECRET` (32+ random characters)
- [ ] GitHub repo is set to **Private** (if not public)
- [ ] `.env` file is in `.gitignore` (don't commit it!)
- [ ] Database is backed up locally
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled (all platforms do this automatically)

---

## **Custom Domain (Optional)**

Want `shop.mydomain.com` instead of `maison-veil.onrender.com`?

### With Render:

1. Go to your Render dashboard
2. Your service → Settings → "Custom Domains"
3. Add your domain
4. Update DNS records at your domain registrar (Godaddy, Namecheap, etc.)

Follow Render's instructions for DNS setup (A records or CNAME).

### With Railway:

1. Service settings → "Networking"
2. Add custom domain
3. Update DNS same way

---

## **Monitoring & Maintenance**

### View Logs
- **Render:** Dashboard → Service → "Logs"
- **Railway:** Deployments tab → see build/runtime logs

### Redeploy
- Push code to GitHub → auto-deploys in 2-5 minutes
- Or manually trigger in dashboard

### Database Backup
- Your `shop.db` file is on the server
- Render/Railway keep daily backups
- You can download it from file system access

---

## **Production Best Practices**

### 1. Keep Your Passwords Secret
- Never share `.env` file
- Never put passwords in GitHub (use env variables)
- Change password every 6 months

### 2. Update Regularly
- Keep Node.js dependencies updated: `npm update`
- Monitor security advisories: `npm audit`

### 3. Monitor Performance
- Check logs for errors
- Watch response times
- Database size shouldn't grow too large

### 4. Backup Data
- Download `shop.db` monthly
- Save it somewhere safe
- Test restore once a year

### 5. Scale When Needed
- Free tier handles ~100 concurrent users
- If you get popular, upgrade to paid plan
- Add CDN for faster static files

---

## **Troubleshooting Production Issues**

| Problem | Solution |
|---------|----------|
| Deployment fails | Check logs, ensure all env vars are set |
| Website shows error 500 | Check server logs for actual error |
| Products not loading | Verify database migration ran (should be auto) |
| Admin login doesn't work | Check `ADMIN_PASSWORD` env variable matches |
| Site is slow | Upgrade plan or optimize database queries |
| Out of storage | Render Free: 100MB; Railway Free: more generous |

---

## **Updating Your Live Shop**

After deployment, to update products or fix bugs:

1. Make changes on your laptop
2. Test locally (`npm start`)
3. Push to GitHub:
   ```bash
   git add .
   git commit -m "Update product prices"
   git push
   ```
4. Render/Railway auto-deploys in 2-5 minutes
5. Your live site updates instantly ✓

---

## **Email Notifications (Optional)**

To get email alerts for deployment failures:

- **Render:** Settings → Notifications → Enable
- **Railway:** Project settings → Notifications

---

## **Scaling to Multiple Regions**

If you're global:
- **Render:** One region free; add more regions with paid plan
- **Railway:** Automatically distributed
- **Cloudflare:** Add as CDN in front for global caching

---

## **Performance Monitoring**

Free tools to monitor your site:

- [Uptime Robot](https://uptimerobot.com) - alerts if site goes down
- [New Relic](https://newrelic.com) - performance tracking
- [Sentry](https://sentry.io) - error tracking

---

## **Your Live Shop URL**

Once deployed, share this link with customers:

```
https://maison-veil.onrender.com
```

**Or your custom domain:**

```
https://shop.yourdomain.com
```

---

## **Questions?**

| Need | Where |
|------|-------|
| Domain help | Domain registrar docs or Render/Railway docs |
| HTTPS issues | Usually auto-setup; contact platform support |
| Database questions | SQLite docs or ask in platform community |
| Performance tuning | Platform-specific docs |

---

## **Success! 🎉**

Your Maison Veil shop is now:
- ✅ **Live** on the internet
- ✅ **Secure** with HTTPS
- ✅ **Fast** with auto-scaling
- ✅ **Backed up** daily
- ✅ **Professional** with custom domain option

Congratulations! You're running a real e-commerce business. 🎀

Next: Tell your customers, add more products, and start taking orders!
