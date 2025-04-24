// server/server.js

// Import Required Modules
const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db");
const nodemailer = require("nodemailer");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const NodeCache = require("node-cache");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const rateLimit = require("express-rate-limit");

dotenv.config();

// Check for required environment variables
const requiredEnvVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "CALENDAR_ID",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "GOOGLE_API_KEY",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("Missing required environment variables:", missingVars);
  process.exit(1);
}

// Initialize Express Application
const app = express();
app.use(express.json());

// CORS Configuration
const corsOptions = {
  origin: "https://www.kcmi-rcc.org",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// reCAPTCHA Verification
async function verifyRecaptcha(token) {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY_CONTACT;
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: { secret: secretKey, response: token },
      }
    );
    return response.data.success;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

// Handle Contact Form Submission
app.post("/submit-contact", async (req, res) => {
  const { email, phone, message, recaptchaToken } = req.body;

  if (!(await verifyRecaptcha(recaptchaToken))) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA failed" });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email required" });
  }

  if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone format" });
  }

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: "kcmi.forms@gmail.com",
    subject: "New Contact-Us Form Request",
    text: `Email: ${email}\nPhone: ${phone || "Not provided"}\nMessage: ${
      message || "No message provided"
    }`,
  };

  const autoReplyMailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Thank you for contacting KCMI!",
    text: "We have received your message and will get back to you shortly.\n\nGod bless you!\nKCMI Team",
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(autoReplyMailOptions);
    res.json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("Email failed:", error);
    res.status(500).json({ success: false, message: "Error sending message" });
  }
});

// Handle Subscription Form Submission
app.post("/subscribe", async (req, res) => {
  const { email, subscriptionType, recaptchaToken } = req.body;

  if (!(await verifyRecaptcha(recaptchaToken))) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA failed" });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email required" });
  }

  try {
    if (subscriptionType === "whatsapp") {
      const whatsappLink = `https://wa.me/+2349134448322?text=Subscribe`;
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Join Daily Faith Recharge on WhatsApp",
        text: `Click here to join our WhatsApp broadcast: ${whatsappLink}\n\nGod bless you!\nKCMI Team`,
      });
      res.json({ success: true, message: "WhatsApp subscription link sent!" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid subscription type" });
    }
  } catch (error) {
    console.error("Subscription failed:", error);
    res.status(500).json({ success: false, message: "Error subscribing" });
  }
});

// Database Connection Check
app.get("/api/db-check", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ success: true, message: "Database connection successful!" });
  } catch (error) {
    console.error("Database connection failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Database connection error" });
  }
});

// Livestream Routes
const livestreamRoutes = require("../api/livestream");
app.use("/api/livestream", livestreamRoutes);

// Google Calendar API Setup
const calendarCache = new NodeCache({
  stdTTL: 1800,
  checkperiod: 300,
});

// Initialize OAuth2 client
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  scope: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
  ].join(" "),
});

// Middleware to verify calendar authentication
async function verifyCalendarAuth() {
  if (
    !oauth2Client.credentials.access_token ||
    oauth2Client.credentials.expiry_date < Date.now()
  ) {
    console.log("Refreshing access token...");
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
  }
}

// Calendar API route with OAuth 2.0
app.get("/api/calendar-events", async (req, res) => {
  try {
    await verifyCalendarAuth();

    const cachedEvents = calendarCache.get("events");
    if (cachedEvents) {
      res.set("X-Cache", "HIT");
      return res.json(cachedEvents);
    }

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);

    const response = await calendar.events.list({
      calendarId: process.env.CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    calendarCache.set("events", events);
    res.set("X-Cache", "MISS");
    res.set("Cache-Control", "public, max-age=900");
    res.json(events);
  } catch (error) {
    console.error("Calendar API error:", error);
    const staleEvents = calendarCache.get("events");
    if (staleEvents) {
      return res.json({
        events: staleEvents,
        warning: "Showing cached data due to API error",
      });
    }
    res.status(500).json({
      error: "Failed to fetch calendar events",
      details: error.message,
    });
  }
});

// Rate Limiting
const calendarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    res.set("Retry-After", 15 * 60);
    res.status(429).json({
      error: "Too many requests",
      message: "Please try again later",
    });
  },
});
app.use("/api/calendar-events", calendarLimiter);

// Authentication Endpoint
app.post("/api/auth", async (req, res) => {
  const { username, password } = req.body;

  if (username === process.env.AD_USER && password === process.env.AD_PASS) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "1m",
    });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Google Drive Manifest Endpoint
app.get("/api/drive-manifest", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Manifest ID required" });

    // Refresh token if needed
    if (oauth2Client.isTokenExpiring()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
    }

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    // Verify access first
    await drive.files.get({
      fileId: id,
      fields: "id,name",
    });

    // Get file content
    const response = await drive.files.get(
      {
        fileId: id,
        alt: "media",
      },
      { responseType: "json" }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Drive API Error:", error);

    // Detailed error response
    let statusCode = 500;
    let errorMessage = "Failed to load manifest";

    if (error.code === 403) {
      statusCode = 403;
      errorMessage = "Missing required permissions to access the file";
    } else if (error.code === 404) {
      statusCode = 404;
      errorMessage = "File not found";
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Test Database Connection
async function testDB() {
  try {
    console.log("Testing database connection...");
    const [rows] = await pool.execute("SELECT 1");
    console.log("✅ Database connected successfully!", rows);
  } catch (error) {
    console.error("❌ Database connection failed!", error);
  }
}

testDB();
