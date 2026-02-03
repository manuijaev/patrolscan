# Deployment Guide

## Free Deployment (Vercel + Render)

### Backend: Deploy to Render

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Deploy Backend**
   - Click "New +" > "Web Service"
   - Connect your GitHub repository
   - Select the `patrol-backend` folder
   - Build Command: `npm install`
   - Start Command: `npm run dev`
   - Add Environment Variable:
     - `JWT_SECRET` = (click "Generate" to create a secure secret)

3. **Get Backend URL**
   - After deployment, copy your backend URL (e.g., `https://patrol-backend.onrender.com`)

---

### Frontend: Deploy to Vercel

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Deploy Frontend**
   - Click "Add New..." > "Project"
   - Import your GitHub repository
   - Set Output Directory: `dist`
   - Add Environment Variable:
     - `VITE_API_URL` = Your Render backend URL + `/api`
     - Example: `https://patrol-backend.onrender.com/api`
   - Click "Deploy"

3. **Get Frontend URL**
   - After deployment, your app is live at `https://patrol-dashboard.vercel.app`

---

### Test Your Deployment

1. **Admin Login:** `https://your-vercel-url/admin-login`
2. **Guard Login:** `https://your-vercel-url/guard-login`
3. **Camera Works!** HTTPS ensures camera permissions work

---

### Camera Permissions

With HTTPS (provided by Vercel):
- Camera works automatically
- PWA installation works
- Guards can scan QR codes

---

### Troubleshooting

**Camera Not Working?**
- Ensure you're using HTTPS (Vercel provides this)
- Grant camera permission in browser settings

**CORS Errors?**
- Backend CORS is configured to allow all origins
- If issues persist, check backend logs on Render
