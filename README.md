# Kingdom Covenant Ministries International (KCMI) Website

Official Web Platform for Kingdom Covenant Ministries International (KCMI) / Rehoboth Christian Center

A dynamic, responsive, and type-safe web application built to serve the KCMI community. It showcases the church's mission, leadership, sermons, and events, featuring a live-updating promotional system and livestream capabilities.

---

## 🌐 Live Sites

- **Production:** kcmi-rcc.org
- **Backend Server:** kcmi-backend.onrender.com

---

## ✨ Features

### Ministry & Community Engagement

- Homepage with a dynamic promotional events section powered by Google Sheets.
- Dedicated pages for Apostle Aikins' biography, global church locations, and ministry information.
- Interactive events calendar through Google Calendar integration.
- Livestream page with a dynamic embed for live services.
- Youth Camp registration page with secure file uploads to Google Drive.
- Contact forms and WhatsApp subscriptions protected by Google reCAPTCHA v3.

### Technical & Administrative

- Hybrid TypeScript/JavaScript Core: Key modules are written in TypeScript for enhanced stability and type safety, integrated with existing JavaScript modules.
- Secure Admin Panel: A JWT-protected panel for managing livestream settings.
- Robust Authentication: Utilizes a Google Service Account for secure, server-to-server interaction with Google APIs (Sheets, Drive, Calendar).
- Modern UI: Dark mode toggle with local storage persistence, fully responsive design, and animations via AOS.
- Embedded Services: Integrated Google Maps with directions and a click-to-copy WhatsApp number feature.

---

## 🛠 Technology Stack

- **Core Logic:** TypeScript & Node.js with Express.js
- **Frontend:** HTML5, CSS3 (Bootstrap 5), JavaScript (ES6+)
- **Database:** MySQL on Aiven

**Key Libraries:**

- googleapis for Google Workspace APIs
- google-auth-library for secure Service Account authentication
- nodemailer for SMTP email services
- multer for file uploads

**Hosting & Deployment:**

- **Frontend:** Vercel
- **Backend:** Render
- **DNS & CDN:** Cloudflare

---

## 📂 Project Structure

This is a high-level overview of the current project structure, reflecting both TypeScript and JavaScript files.

```
church_website/
├── api/
│   └── livestream.ts      # (TypeScript) Livestream management API
├── public/                # Frontend source assets (HTML, CSS, JS, TS)
│   ├── admin/             # Admin panel assets
│   │   └── js/admin.js
│   ├── assets/            # Images, Videos, etc.
│   ├── css/               # All Stylesheets
│   ├── js/                # Scripts folder
│   │   ├── promos.ts      # (TypeScript) Promo events logic
│   │   ├── scripts.ts     # (TypeScript) Main site interactivity
│   │   ├── church-calendar.js # (JavaScript) Calendar logic
│   │   └── loading.js     # (JavaScript) Loading screen logic
│   └── *.html             # All HTML pages
├── server/                # Backend server source
│   ├── db.ts              # (TypeScript) Database connection
│   └── server.ts          # (TypeScript) Main Express server
├── .env.example           # Environment variables template
├── package.json
└── tsconfig.json          # TypeScript compiler configuration
```

---

## ⚙️ Local Development & Setup

### Clone Repository

```bash
git clone https://github.com/JosephTeteE/KCMI-Website.git
cd KCMI-Website
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

- Copy `.env.example` to a new file named `.env`.
- Populate `.env` with all required credentials.
- **Important:** The `GOOGLE_CREDENTIALS_BASE64` variable must contain the entire JSON key file for your Google Service Account, encoded in Base64 format.

### Run the Development Server

This command uses `ts-node-dev` to run the server and automatically restart it when you make changes to any `.ts` file.

```bash
npm run dev
```

The server will be available at [http://localhost:5000](http://localhost:5000) (or the port specified in your `.env`).

---

## 🚀 Deployment

The project is configured for a dual-deployment setup where the build process compiles TypeScript and prepares all static assets for serving.

### Backend (Render)

- **Build Command:** `npm run build`
- **Start Command:** `node dist/server/server.js`

### Frontend (Vercel)

- **Build Command:** `npm run build`
- **Output Directory:** `dist/public`

The `npm run build` script (`tsc && copyfiles ...`) is the single source of truth for creating the production-ready `dist` directory.
