# Kingdom Covenant Ministries International (KCMI) Website

This project is the official website for **Kingdom Covenant Ministries International (KCMI)**. It provides information about the church, its mission, leadership, sermons, services, locations, and giving. The website also features a **dynamic livestream page** and an **admin panel** for updating the livestream embed code.

## 🌟 Features

- Homepage with video background and upcoming events.
- Pages for Apostle Aikins, services, sermons, giving, FAQs, and church locations.
- Contact form with **Google reCAPTCHA v3** integration for spam prevention.
- **Livestream page** that dynamically embeds **Facebook Live** videos.
- **Admin panel** (protected with **JWT authentication**) to update the livestream embed code and its visibility status.
- **Dark mode toggle** for user preference.
- Fully **responsive design** for mobile, tablet, and desktop views.
- Embedded **Google Maps** and **Google Calendar** for convenience.

## 🔧 Technology Stack

### Frontend

- HTML5
- CSS3 (with **Bootstrap 5**)
- JavaScript (ES6+)
- **AOS (Animate On Scroll)** Library

### Backend

- Node.js
- Express.js
- MySQL (via `mysql2`)
- dotenv (for environment variable management)
- Nodemailer (for sending emails)

### External Services

- Google reCAPTCHA v3
- Google Fonts
- Google Calendar (embedded)
- Google Maps (embedded)
- Facebook Live Embed
- CDNs: Bootstrap, FontAwesome, AOS

### Hosting & Deployment

- Frontend: **Vercel**
- Backend: **Render**
- Database: **Aiven (MySQL)**
- Version Control: **GitHub**

### Development Tools

- Visual Studio Code

## 📁 Directory Structure

```
├── api/
│   └── livestream.js # Backend API route for livestream
├── public/
│   ├── admin/
│   │   ├── index.html # Admin dashboard UI
│   │   └── js/
│   │       └── admin.js # Admin panel logic
│   ├── assets/
│   │   └── img/ # Images and videos
│   ├── css/
│   │   └── styles.css # Main stylesheet
│   ├── js/
│   │   └── scripts.js # Main frontend JavaScript
│   ├── about-apostle-aikins.html
│   ├── contact-us.html
│   ├── faqs.html
│   ├── giving-kcmi.html
│   ├── index.html # Homepage
│   ├── livestream.html
│   ├── location.html
│   ├── mission-kcmi.html
│   ├── sermons.html
│   └── services.html
├── server/
│   ├── db.js # MySQL database connection
│   └── server.js # Main Node.js backend server
└── .env.example # Sample env file (no secrets)
```

## ⚙️ Installation and Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/kcmi-website.git
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   - Create a `.env` file in the root directory using the `.env.example` template.
   - Add your database credentials, JWT secret, and email config.

4. **Start the backend server:**
   ```bash
   node server/server.js
   ```

## 📌 Security Notes

The `.env` file contains sensitive information (DB credentials, JWT secrets, email auth, etc.) — make sure it is NOT committed to version control.

Add this to your `.gitignore` (already recommended):

```
.env
```

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit a pull request.

## 📜 License

This project is licensed under the MIT License.

## 📈 Future Improvements

- Add a blog section.
- Implement search functionality.
- Improve accessibility and ARIA support.
- Optimize performance and loading speed.
- Add a content management dashboard (CMS-style).

## 🙏 Acknowledgements

Thanks to all contributors, the KCMI media team, and the global developer community whose tools power this website.
