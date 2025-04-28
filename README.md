# Kingdom Covenant Ministries International (KCMI) Website

Welcome to the official website project for Kingdom Covenant Ministries International (KCMI), also known as Rehoboth Christian Center. This dynamic, responsive web platform showcases the church's mission, leadership, sermons, events, and livestream content.

## Live Sites

- **Development/Staging**: [https://kcmiwebsite-vercel.app/](https://kcmiwebsite-vercel.app/)
- **Production**: [https://www.kcmi-rcc.org/](https://www.kcmi-rcc.org/)

---

## 🌟 Features

- **Homepage** with video background and upcoming events
- **Church Events Calendar** showing 3 upcoming date groups (with all events per date)
- Pages for **Apostle Aikins**, services, sermons, giving, FAQs, and church locations
- **Contact form** with Google reCAPTCHA v3 integration for spam prevention
- **WhatsApp subscription form** integrated with Google reCAPTCHA v3
- **Livestream page** dynamically embedding Facebook Live videos
- **Admin panel** (protected with JWT authentication) to update the livestream embed code
- **Dark mode toggle** for user preference
- Fully responsive design for mobile, tablet, and desktop views
- Embedded **Google Maps** and **Google Calendar** for convenience
- Contact form submissions sent via **Zoho SMTP**
- WhatsApp subscription link sent via **Zoho SMTP**
- **Dynamic Events Promos** section pulling from a Google Drive manifest file with client-side caching

---

## 🔧 Technology Stack

### Frontend

- HTML5
- CSS3 (with Bootstrap 5)
- JavaScript (ES6+)
- AOS (Animate On Scroll) Library
- Google Calendar API integration with optimized event display

### Backend

- Node.js
- Express.js
- MySQL (via mysql2)
- dotenv (for environment variable management)
- Nodemailer (for sending emails via Zoho SMTP)
- axios (for making HTTP requests, including reCAPTCHA verification)
- jwt (for JSON Web Token authentication)
- Google Calendar API integration

### External Services

- Google reCAPTCHA v3
- Google Fonts
- Google Calendar (embedded)
- Google Maps (embedded)
- Facebook Live Embed
- Zoho SMTP (for email sending)
- CDNs: Bootstrap, FontAwesome, AOS

### Hosting & Deployment

- **Frontend**: Vercel
- **Backend**: Render
- **Database**: Aiven (MySQL)
- **Version Control**: GitHub

### Development Tools

- Visual Studio Code

---

## 📁 Directory Structure

```
├── api/
│   └── livestream.js              # Backend API route for livestream management
├── kcmi-rcc-worker/
│   ├── src/                       # Source code for the Cloudflare Worker
│   ├── test/                      # Tests for the Cloudflare Worker
│   └── ...                        # Other worker-related files (package.json, etc.)
├── node_modules/                  # Node.js dependencies
├── public/
│   ├── admin/
│   │   ├── index.html             # Admin dashboard UI
│   │   └── js/
│   │       └── admin.js           # Admin panel logic
│   ├── assets/
│   │   └── img/                   # Images and videos
│   ├── css/
│   │   ├── styles.css             # Main stylesheet
│   │   ├── loading.css            # Homepage loading content stylesheet
│   │   └── church-calendar.css    # Church events calendar styles
│   ├── js/
│   │   ├── scripts.js             # Main frontend JavaScript
│   │   ├── loading.js             # Homepage loading content logic
│   │   ├── church-calendar.js     # Main calendar logic
│   │   ├── gapi-loader.js         # Google API initialization logic
│   │   └── promos.js              # Church upcoming events logic (Google Drive integration)
│   ├── about-apostle-aikins.html
│   ├── contact-us.html
│   ├── faqs.html
│   ├── giving-kcmi.html
│   ├── index.html                 # Homepage
│   ├── livestream.html
│   ├── location.html
│   ├── mission-kcmi.html
│   ├── sermons.html
│   └── services.html
├── server/
│   ├── db.js                      # MySQL database connection
│   ├── server.js                  # Main Node.js backend server
│   └── certs/                     # Directory for SSL certificates
└── .env.example                   # Sample env file (no secrets)
└── README.md                      # Project documentation
```

---

## 🔍 Codebase Description

### `api/livestream.js`

Defines backend API routes for managing the livestream embed code. Handles fetching and updating the embed code, interacting with the MySQL database.

### `public/admin/index.html`

Provides the user interface for the admin panel, specifically for managing the livestream embed code.

Key Features:

- **Login Page**: Authentication for administrators.
- **Livestream Management**: Form to manage embed code and live status.
- **Authentication**: Validates tokens in localStorage.
- **Styling**: Uses Bootstrap and custom CSS.

### `public/admin/js/admin.js`

Client-side functionality for the admin panel.

Key Features:

- **Livestream Embed Code Management**: Fetches and updates embed code.
- **API Interaction**: Communicates with the backend API.
- **Error Handling**: Displays user-friendly error messages.

### `public/js/scripts.js`

Main frontend logic for the website.

Key Features:

- **reCAPTCHA Initialization**
- **Livestream Embed Code Management**
- **Navbar Behavior**
- **Smooth Scrolling**
- **Dark Mode Toggle**

### `server/server.js`

Main entry point for the backend server.

Key Features:

- **API Server**
- **Database Integration**
- **Google API Integration**
- **User Authentication**
- **Email Handling**
- **CORS Support**
- **Error Handling**

---

## ⚙️ Installation and Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/JosephTeteE/KCMI-Website.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   - Create a `.env` file using `.env.example` as a template.
   - Add database credentials, JWT secret, email config, and reCAPTCHA keys.

4. Configure Events Promos:

   - Create a JSON manifest file on Google Drive with event data.
   - Update the `PROMO_SHEET_ID` constant in `public/js/promos.js`.

5. Start the backend server:
   ```bash
   node server/server.js
   ```

---

## 📌 Security Notes

- The `.env` file contains sensitive information (DB credentials, JWT secrets, etc.) — ensure it is **NOT** committed to version control.
- Add `.env` to your `.gitignore` file.

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit a pull request.

---

## 📜 License

This project is licensed under the MIT License.

---

## 📈 Future Improvements

- Add a blog section.
- Implement search functionality.
- Improve accessibility and ARIA support.
- Optimize performance and loading speed.
- Add a content management dashboard (CMS-style).

---

## 🙏 Acknowledgements

Thanks to all contributors, the KCMI media team, and the global developer community whose tools power this website.
