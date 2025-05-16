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

// Load environment variables from .env file
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
  "GOOGLE_API_KEY", // Required for Google Maps integration
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("Missing required environment variables:", missingVars);
  process.exit(1);
}

// Initialize Express Application
const app = express();
app.use(express.json()); // Parse incoming JSON requests

// CORS Configuration
const corsOptions = {
  origin: "https://www.kcmi-rcc.org", // Allow requests from this origin
  methods: ["GET", "POST"], // Allowed HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

// ==========================================================================
// Nodemailer Configuration
// Purpose: Setup for sending emails through SMTP
// ==========================================================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // Use TLS
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ==========================================================================
// reCAPTCHA Verification
// Purpose: Validates reCAPTCHA tokens submitted with forms
// ==========================================================================
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
    return response.data.success; // Return true if verification succeeds
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

// ==========================================================================
// Contact Form Submission Handler
// Purpose: Processes contact form submissions with validation and email sending
// ==========================================================================
app.post("/submit-contact", async (req, res) => {
  const { email, phone, message, recaptchaToken } = req.body;

  // Verify reCAPTCHA token
  if (!(await verifyRecaptcha(recaptchaToken))) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA failed" });
  }

  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email required" });
  }

  // Validate phone format (if provided)
  if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone format" });
  }

  // Email options for admin and auto-reply
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
    // Send emails
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(autoReplyMailOptions);
    res.json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("Email failed:", error);
    res.status(500).json({ success: false, message: "Error sending message" });
  }
});

// ==========================================================================
// Subscription Form Handler
// Purpose: Manages newsletter and WhatsApp subscription requests
// ==========================================================================
app.post("/subscribe", async (req, res) => {
  const { email, subscriptionType, recaptchaToken } = req.body;

  // Verify reCAPTCHA token
  if (!(await verifyRecaptcha(recaptchaToken))) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA failed" });
  }

  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email required" });
  }

  try {
    if (subscriptionType === "whatsapp") {
      // Send WhatsApp subscription link via email
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

// ==========================================================================
// Database Health Check
// Purpose: Provides an endpoint to verify database connectivity
// ==========================================================================
app.get("/api/db-check", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping(); // Check if the database is reachable
    connection.release();
    res.json({ success: true, message: "Database connection successful!" });
  } catch (error) {
    console.error("Database connection failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Database connection error" });
  }
});

// ==========================================================================
// Livestream Routes
// Purpose: Handles livestream-related functionality
// ==========================================================================
const livestreamRoutes = require("../api/livestream");
app.use("/api/livestream", livestreamRoutes);

// ==========================================================================
// Google Calendar API Setup
// Purpose: Configures OAuth2 for Google Calendar and implements caching
// ==========================================================================
const calendarCache = new NodeCache({
  stdTTL: 1800, // Cache events for 30 minutes
  checkperiod: 300, // Check for expired cache every 5 minutes
});

// Initialize OAuth2 client for Google APIs
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
    "https://www.googleapis.com/auth/spreadsheets.readonly",
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

    // Check if events are cached
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

    // Fetch events from Google Calendar
    const response = await calendar.events.list({
      calendarId: process.env.CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    calendarCache.set("events", events); // Cache the events
    res.set("X-Cache", "MISS");
    res.set("Cache-Control", "public, max-age=900"); // Cache-Control header
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

// Rate Limiting for Calendar API
const calendarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100, // Limit each IP to 100 requests per window
  handler: (req, res) => {
    res.set("Retry-After", 15 * 60); // Retry after 15 minutes
    res.status(429).json({
      error: "Too many requests",
      message: "Please try again later",
    });
  },
});
app.use("/api/calendar-events", calendarLimiter);

// ==========================================================================
// Authentication Endpoint
// Purpose: Handles admin authentication with JWT
// ==========================================================================
app.post("/api/auth", async (req, res) => {
  const { username, password } = req.body;

  // Validate credentials
  if (username === process.env.AD_USER && password === process.env.AD_PASS) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "1m", // Token expires in 1 minute
    });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// ==========================================================================
// Google Drive Manifest Endpoint
// Purpose: Retrieves manifest files from Google Drive
// ==========================================================================
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

    // Verify access to the file
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

    // Handle specific error codes
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

// ==========================================================================
// Google Sheets Events Endpoint
// Purpose: Retrieves and processes event data from Google Sheets
// ==========================================================================
app.get("/api/sheets-events", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Sheet ID required" });

    // Refresh token if needed
    if (oauth2Client.isTokenExpiring()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
    }

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // Get all data from the first sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: id,
      range: "A1:N100", // Columns A-N, up to 100 rows
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return res.json([]); // Return empty if no data

    // Process rows into event objects
    const events = [];
    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, ""));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue; // Skip empty rows

      // Build times object from time columns
      const times = {};
      if (row[6] && row[6].toLowerCase() === "yes") {
        times.allday = true;
      } else {
        if (row[7]) times.morning = formatTime(row[7]);
        if (row[8]) times.afternoon = formatTime(row[8]);
        if (row[9]) times.evening = formatTime(row[9]);
      }

      const event = {
        title: row[0] || "",
        type: (row[1] || "pdf").toLowerCase(),
        fileId: row[2] || "",
        description: row[3] || "",
        date: formatDate(row[4]),
        endDate: row[5] ? formatDate(row[5]) : formatDate(row[4]),
        times: Object.keys(times).length > 0 ? times : null,
        location: row[10] || "",
        contact: {
          number: row[11] || "",
          instructions: row[12] || "",
        },
        notes: row[13] || "",
      };

      events.push(event);
    }

    res.json(events);

    // Helper functions
    function formatDate(dateString) {
      if (!dateString) return "";
      // Try to parse various date formats
      const date = new Date(dateString);
      return isNaN(date.getTime())
        ? dateString
        : date.toISOString().split("T")[0];
    }

    function formatTime(timeString) {
      if (!timeString) return "";
      // Convert "9am" to "9:00 AM" etc.
      return timeString
        .replace(/(\d+)([ap]m)/i, "$1:00 $2")
        .replace(/([ap]m)/i, (match) => match.toUpperCase());
    }
  } catch (error) {
    console.error("Sheets API Error:", error);
    res.status(500).json({
      error: "Failed to load events",
      details: process.env.NODE_ENV === "development" ? error.message : "",
    });
  }
});

// ==========================================================================
// Google Maps Proxy Endpoint
// Purpose: Provides secure access to Google Maps configuration with caching
// Security: Uses server-side proxying to protect API key
// Performance: Implements caching to reduce API calls
// ==========================================================================

// Initialize cache for map configuration
const mapCache = new NodeCache({
  stdTTL: 3600, // Cache for 1 hour
  checkperiod: 600, // Check every 10 minutes
});

// Rate limiting for maps endpoint
const mapLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many map requests, please try again later",
});

app.get("/api/maps-proxy", mapLimiter, async (req, res) => {
  const cacheKey = "mapConfig";
  const cachedData = mapCache.get(cacheKey);

  if (cachedData) {
    res.set("X-Cache", "HIT");
    return res.json(cachedData);
  }

  try {
    const mapConfig = {
      churchLocation: {
        lat: 4.831148938457418,
        lng: 7.01167364093468,
      },
      zoom: 16,
      apiKey: process.env.GOOGLE_API_KEY,
    };

    mapCache.set(cacheKey, mapConfig);
    res.set("X-Cache", "MISS");
    res.json(mapConfig);
  } catch (error) {
    console.error("Map proxy error:", error);
    res.status(500).json({
      error: "Failed to load map data",
      details: process.env.NODE_ENV === "development" ? error.message : "",
    });
  }
});

// ==========================================================================
// Security Middleware
// Purpose: Enhances security with Content Security Policy headers
// ==========================================================================
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https://*.googleapis.com https://*.gstatic.com; " +
      "connect-src 'self' https://*.googleapis.com https://kcmi-backend.onrender.com; " +
      "frame-src 'self' https://www.google.com; " +
      "font-src 'self' https://fonts.gstatic.com"
  );
  next();
});

// ==========================================================================
// Server Startup and Error Handling
// ==========================================================================
const PORT = process.env.PORT || 5000;
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ==========================================================================
// Database Connection Test
// Purpose: Verifies database connectivity on startup
// ==========================================================================
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
