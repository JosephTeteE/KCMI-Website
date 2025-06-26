# Kingdom Covenant Ministries International (KCMI) Website

**Official Website for Kingdom Covenant Ministries International (KCMI) / Rehoboth Christian Center**

A dynamic, responsive web platform showcasing the church's mission, leadership, sermons, events, and livestream content.

---

## 🌐 Live Sites

- **Production:** [kcmi-rcc.org](https://www.kcmi-rcc.org/)
- **Staging:** [kcmiwebsite-vercel.app](https://kcmiwebsite-vercel.app/)

---

## ✨ Features

### Ministry Presentation

- Homepage with video background and upcoming events
- Dedicated pages for Apostle Aikins, services, sermons, and locations
- Mission statement and FAQ sections

### Engagement Tools

- Events calendar (shows 3 upcoming date groups)
- Youth Camp page with registration
- Contact form and WhatsApp subscription (Google reCAPTCHA v3)
- Livestream page with dynamic Facebook Live embed

### Administrative Features

- Secure admin panel (JWT-protected) for livestream management
- Dynamic event promos (Google Drive integration)
- Contact/WhatsApp forms via Zoho SMTP

### Technical Features

- Dark mode toggle (with local storage)
- Fully responsive design (mobile, tablet, desktop)
- Embedded Google Maps with directions
- Google Calendar integration
- Click-to-copy WhatsApp number

---

## 🛠 Technology Stack

- **Frontend:** HTML5, CSS3 (Bootstrap 5), JavaScript (ES6+)
- **Backend:** Node.js, Express.js, MySQL
- **Edge Computing:** Cloudflare Workers

**Key Libraries:**

- AOS (Animate On Scroll)
- Google APIs (Calendar, Maps, reCAPTCHA v3)
- JWT for authentication
- Nodemailer for email services

**Hosting:**

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** Aiven (MySQL)
- **DNS/CDN:** Cloudflare

---

## 📂 Project Structure

```
church_website/
├── api/                # API endpoints
│   └── livestream.js   # Livestream management API
├── kcmi-rcc-worker/    # Cloudflare Worker
│   ├── src/            # Worker source code
│   └── test/           # Worker tests
├── public/             # Frontend assets
│   ├── admin/          # Admin panel
│   ├── assets/         # Images and media
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   └── *.html          # Website pages
├── server/             # Backend server
│   ├── db.js           # Database connection
│   └── server.js       # Main server logic
├── uploads/            # File upload directory
└── .env.example        # Environment template
```

---

## ⚙️ Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/JosephTeteE/KCMI-Website.git
   cd KCMI-Website
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment:**

   - Copy `.env.example` to `.env`
   - Fill in required credentials (database, email, reCAPTCHA)

4. **Database setup:**

   - Ensure MySQL database is configured with the provided schema

5. **Start development server:**
   ```bash
   node server/server.js
   ```

---

## 🔒 Security & Maintenance

- All sensitive credentials are stored in `.env` (excluded from version control)
- API endpoints are protected with rate limiting
- Admin panel requires JWT authentication
- Regular backups of database and content are maintained

---

## 📜 License & Usage

This website and its codebase are property of Kingdom Covenant Ministries International. The code is provided for reference and maintenance purposes only. Unauthorized distribution or reuse is not permitted without explicit written consent from KCMI leadership.

---

## 🙏 Acknowledgements

We gratefully acknowledge:

- The KCMI media and leadership teams
- Open source developers whose tools power this website
- Volunteers who contributed to this project

For questions about the website, please contact the KCMI administration.
