# Kingdom Covenant Ministries International (KCMI) Website

Official Web Platform for Kingdom Covenant Ministries International (KCMI) / Rehoboth Christian Center

A dynamic, responsive, and type-safe web application built to serve the KCMI community. It showcases the church's mission, leadership, sermons, and events, featuring a live-updating promotional system and livestream capabilities.

---

## 🌐 Live Sites & Subdomains

- **Main Website:** [kcmi-rcc.org](https://kcmi-rcc.org)
- **Camp Microsite:** [camp.kcmi-rcc.org](https://camp.kcmi-rcc.org)
- **Backend Server:** [kcmi-backend.onrender.com](https://kcmi-backend.onrender.com)

---

## ✨ Key Features

### Core Website Functionality

- **Dynamic Promotional System**: Powered by Google Sheets API with service account authentication
- **Event Management**: Google Calendar integration with caching for performance
- **Livestream System**: Admin-controlled embed codes with live status indicators
- **Contact Forms**: Protected by reCAPTCHA v3 with automated email responses
- **WhatsApp Broadcast**: Subscription system protected by Google reCAPTCHA v3.

### Youth Camp Microsite

- **Registration System**: Secure form with Cloudinary file uploads
- **Payment Records Processing**: Integrated with Google Drive for receipt storage
- **Interactive UI**: Drag-and-drop receipt upload, clipboard functionality

### Technical Infrastructure

- **Authentication**: JWT for admin panel, Google Service Account for APIs
- **Database**: MySQL on Aiven with connection pooling
- **Caching**: NodeCache for calendar events and map configurations
- **Security**: Rate limiting, CSP headers, and input validation

---

## 🛠 Technology Stack

### Backend Services

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: MySQL (Aiven Cloud)
- **Email**: Nodemailer with SMTP
- **File Storage**: Google Drive + Cloudinary

### Frontend

- **Core**: Vanilla JavaScript + TypeScript
- **Styling**: Bootstrap 5 + Custom CSS
- **Animations**: AOS (Animate On Scroll)
- **Maps**: Google Maps API

### APIs & Integrations

- **Google Workspace**: Sheets, Drive, Calendar
- **reCAPTCHA**: v3 for forms, v2 for camp registration
- **Cloudinary**: Image and PDF uploads for camp receipts

---

## 📂 Project Structure

```
church_website/
├── api/
│   └── livestream.ts      # Livestream management endpoints
├── camp-deploy/           # Camp microsite (Git submodule)
│   ├── public/            # Camp-specific assets
│   └── package.json       # Camp dependencies
├── public/                # Main site assets
│   ├── admin/             # JWT-protected admin panel
│   ├── assets/            # Images, Videos, etc.
│   ├── css/               # All Stylesheets
│   ├── js/                # TypeScript/JavaScript modules
│   └── *.html             # All HTML pages
├── server/                # Backend server source
│   ├── db.ts              # Database connection pool
│   └── server.ts          # Main Application Logic
├── kcmi-rcc-worker/       # Cloudflare worker
└── vercel.json            # Deployment configuration
```

---

## Development Setup

### Prerequisites

- Node.js 18+
- MySQL 8+
- Google Service Account credentials
- Cloudinary account

---

### 🧩 Installation

```bash
# Clone main repository and submodule
git clone --recurse-submodules https://github.com/JosephTeteE/KCMI-Website.git
cd KCMI-Website

# Install dependencies
npm install

# Initialize camp-deploy submodule
cd camp-deploy && npm install && cd ..


```

### 🛠️ Environment Configuration

- Copy `.env.example` to a new file named `.env`.
- Populate `.env` with all required credentials and configuration keys.

Required variables include:

- GOOGLE_CREDENTIALS_BASE64: Base64-encoded service account JSON
- CLOUDINARY_URL: Your Cloudinary API URL
- Database credentials (Aiven)
- SMTP credentials for emails
- reCAPTCHA secret keys

**Important:** Do not commit your `.env` file. It should always be included in `.gitignore`.

### ▶️ Running Locally

```bash
# Start development server
npm run dev

# Build for production
npm run build


## Deployment Strategy

### Main Website (Vercel)

- Automatic deployments from main branch
- Static assets served via Vercel CDN
- Edge functions for dynamic routes

### Backend API (Render)

- Node.js environment with persistent MySQL connection
- Environment variables managed in Render dashboard
- Automatic SSL via Let's Encrypt

### Camp Microsite (Vercel)

- Separate project linked to camp-deploy submodule
- Custom domain: camp.kcmi-rcc.org



## 🔒 Security Practices

### Credential Management

- Service accounts instead of OAuth2
- Base64-encoded credentials in environment variables
- Regular credential rotation

### Input Validation

- reCAPTCHA on all forms
- Rate limiting on API endpoints
- SQL parameterized queries

### Content Security

- Strict CSP headers
- XSS protection middleware
- File upload validation


## 📜 License

This project is proprietary software owned by Kingdom Covenant Ministries International.
Unauthorized use or distribution is prohibited.
```
