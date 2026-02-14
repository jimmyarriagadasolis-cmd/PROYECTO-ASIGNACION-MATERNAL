# Firebase App Hosting Deployment Guide
## Sistema de Asignación Maternal

**Project:** asignacion-maternal  
**Backend:** Express.js + Firestore  
**Deployment:** Firebase App Hosting (Cloud Run)  
**Frontend:** HTML/CSS/JS + Firebase Auth SDK

---

## Prerequisites
- Node.js 20+
- Google Account
- GitHub Repository (for automatic deployment)
- Windows/Mac/Linux with PowerShell or Terminal

---

## Step-by-Step Deployment

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase --version  # Verify installation
```

### 2. Authenticate with Google
```bash
firebase login
firebase projects:list  # Verify authentication
```

### 3. Create Firebase Project
- Go to: https://console.firebase.google.com/
- Click "Create project"
- Name: `asignacion-maternal`
- Accept terms → Create
- Wait for project to be ready

### 4. Upgrade to Blaze Plan (Required for Cloud Run)
- Firebase Console → Upgrade plan
- Select "Blaze" (pay-as-you-go)
- Add payment method
- Cost: ~$0.50-2.50/month for moderate usage

### 5. Enable Firebase Services

#### 5.1 Firestore Database
- Firebase Console → Firestore Database
- Click "Create database"
- Mode: **Production**
- Location: `us-central1` or `southamerica-east1`
- Create

#### 5.2 Authentication
- Firebase Console → Authentication
- Click "Get Started"
- Enable "Email/Password"
- Save

#### 5.3 Register Web App
- Firebase Console → Project Settings (⚙️)
- Click Web app icon (`</>`)
- App name: "Sistema Asignación Maternal"
- Register
- **Copy the `firebaseConfig` object** (you'll need this)

### 6. Configure Local Project

#### 6.1 Create firebase-config.js
```bash
copy frontend\js\firebase-config.template.js frontend\js\firebase-config.js
```

Edit `frontend/js/firebase-config.js` and paste your `firebaseConfig`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "asignacion-maternal.firebaseapp.com",
  projectId: "asignacion-maternal",
  storageBucket: "asignacion-maternal.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
```

#### 6.2 Install Dependencies
```bash
npm install
```

### 7. Create Admin User

#### 7.1 In Firebase Authentication
- Firebase Console → Authentication → Users
- Click "Add user"
- Email: `admin@cultura.gob.cl`
- Password: `admin123`
- Add user
- **Copy the UID** (long alphanumeric code)

#### 7.2 In Firestore
- Firebase Console → Firestore Database
- Click "Start collection"
- Collection ID: `usuarios`
- Document ID: **Paste the UID from step 7.1**
- Add fields:

| Field | Type | Value |
|-------|------|-------|
| username | string | admin |
| nombre_completo | string | Administrador del Sistema |
| email | string | admin@cultura.gob.cl |
| rol | string | administrador |
| departamento | string | TI |
| activo | boolean | true |
| fecha_creacion | timestamp | *current timestamp* |

### 8. Populate Initial Data

#### 8.1 Seed Historical Values (23 periods 2018-2026)
```bash
npm run seed
```

#### 8.2 Create Configuration Collection
In Firestore, create collection `configuracion` with these documents:

| Document ID | Field: valor |
|-------------|-------------|
| tramo1_limite | 631976 |
| tramo1_monto | 22007 |
| tramo2_limite | 923067 |
| tramo2_monto | 13505 |
| tramo3_limite | 1439668 |
| tramo3_monto | 4267 |
| plazo_maximo_años | 5 |
| meses_max_embarazo | 9 |
| nombre_institucion | Ministerio de las Culturas, las Artes y el Patrimonio |

### 9. Deploy Firestore Rules
```bash
firebase deploy --only firestore
```

### 10. Connect GitHub to App Hosting
- Firebase Console → App Hosting
- Click "Create backend"
- Select "GitHub"
- Click "Authorize with GitHub"
- Login and authorize Firebase
- Select your repository and `main` branch
- Click "Create backend"

### 11. Deploy via Git Push
```bash
git add .
git commit -m "Deploy Firebase App Hosting - Backend Firestore"
git push origin main
```

### 12. Monitor Deployment
- Firebase Console → App Hosting
- Wait for status to change from "Building" → "Deploying" → "Live"
- Takes 3-5 minutes first time, 2-3 minutes after

### 13. Get Your App URL
- Firebase Console → App Hosting
- Copy the URL (looks like: `https://asignacion-maternal--backend-xxxxx.us-central1.hosted.app`)

### 14. Test the Application
1. Open the URL in browser
2. Login with:
   - Email: `admin@cultura.gob.cl`
   - Password: `admin123`
3. Verify dashboard loads

### 15. Change Admin Password (Important)
- Firebase Console → Authentication → Users
- Click the three dots (⋮) next to admin user
- Select "Edit password"
- Enter strong password (e.g., `Asignacion2024!Maternal`)
- Update

### 16. Configure SMTP (Optional - for email reports)
1. Open your app URL
2. Login as admin
3. Go to "Configuración"
4. Fill in SMTP settings:
   - Server: `smtp.cultura.gob.cl`
   - Port: `587`
   - Username: your email
   - Password: your password
5. Save

### 17. Monitor Costs
- Firebase Console → Usage and billing
- Set budget alerts if desired
- Expected cost: $0.50-2.50/month for moderate usage

---

## Project Structure

```
backend/                    ← Local backend (SQLite + Express)
backend-firebase/           ← Production backend (Firestore + Express)
├── server.js              ← Entry point for Cloud Run
├── middleware/auth.js     ← Firebase Auth verification
├── routes/                ← API endpoints
├── services/              ← PDF, Excel, Email, Calculations
├── utils/validaciones.js  ← Input validation
└── scripts/               ← Seed data

frontend/                   ← Frontend (HTML/CSS/JS)
├── index.html             ← Loads Firebase SDK dynamically
├── js/app.js              ← Dual-mode auth (Firebase or JWT)
├── js/firebase-config.js  ← Firebase credentials (create from template)
└── css/styles.css

apphosting.yaml            ← Cloud Run configuration
firestore.rules            ← Security rules
firestore.indexes.json     ← Composite indexes
package.json               ← Scripts: start (Firebase), dev (local)
```

---

## Key Commands

```bash
# Development (local SQLite backend)
npm run dev

# Production (Firebase backend)
npm start

# Seed Firestore data
npm run seed

# Deploy Firestore rules only
firebase deploy --only firestore

# List Firebase projects
firebase projects:list

# View deployment logs
firebase apphosting:backends:list --project asignacion-maternal
```

---

## Troubleshooting

### Login fails
- Verify user exists in Firebase Authentication
- Verify user document exists in Firestore with same UID
- Check browser console (F12) for errors
- Verify `firebase-config.js` has correct credentials

### Deployment stuck on "Building"
- Check logs: Firebase Console → App Hosting → Logs
- Verify `npm install` works locally
- Verify `package.json` has `build` and `start` scripts
- Verify `apphosting.yaml` exists in project root

### Firestore permission denied
- Run: `firebase deploy --only firestore`
- Verify user has correct `rol` field in Firestore
- Check `firestore.rules` for correct security rules

### Can't connect to Firestore
- Verify Firestore Database is created
- Verify project is on Blaze plan
- Verify `firebase-admin` is installed: `npm install firebase-admin`

---

## Architecture Overview

**Local Development:**
```
Browser → Express (localhost:3000) → SQLite (sql.js)
Auth: JWT tokens stored in localStorage
```

**Production (Firebase App Hosting):**
```
Browser → Cloud Run (Express) → Firestore
Auth: Firebase ID tokens from Firebase Auth SDK
```

**Frontend Detection:**
- Loads Firebase SDK dynamically
- If Firebase SDK available → uses Firebase Auth
- If Firebase SDK not available → uses local JWT auth
- Automatically detects which backend to use

---

## Cost Estimation (Blaze Plan)

| Service | Usage | Cost/month |
|---------|-------|-----------|
| Cloud Run (App Hosting) | <100 requests | $0-2 |
| Firestore | <100 requests | $0.50 |
| Authentication | <50k users | Free |
| **Total** | **Moderate usage** | **$0.50-2.50** |

First $5/month is free.

---

## Security Notes

- `firebase-config.js` is in `.gitignore` (don't commit credentials)
- Use strong passwords for admin account
- Change default `admin123` password immediately
- Firestore rules enforce role-based access control
- All API endpoints verify Firebase ID tokens

---

## Support & Documentation

- Firebase App Hosting: https://firebase.google.com/docs/app-hosting
- Firebase Console: https://console.firebase.google.com/
- Firestore Documentation: https://firebase.google.com/docs/firestore
- Firebase Authentication: https://firebase.google.com/docs/auth

---

**Ready to deploy!** 🚀
