// server/server.js

// Import Required Modules
const express = require("express"); // Express framework for web server
const path = require("path"); // Node.js module for handling file paths
const cors = require("cors"); // Enable Cross-Origin Resource Sharing
const dotenv = require("dotenv"); // Load environment variables from .env file
const pool = require("./db"); // Import database connection pool
const nodemailer = require("nodemailer"); // Module for sending emails
const axios = require("axios"); // Promise-based HTTP client for making API requests
const jwt = require("jsonwebtoken"); // Import the jsonwebtoken library
const NodeCache = require("node-cache"); // In-memory caching module
const { google } = require("googleapis"); // Google APIs client library
const OAuth2 = google.auth.OAuth2; // OAuth2 client for Google APIs

dotenv.config(); // Load environment variables
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
} // Exit if any required environment variable is missing

// Initialize Express Application
const app = express(); // Create an Express application instance
app.use(express.json()); // Middleware to parse JSON request bodies

// CORS Configuration
const corsOptions = {
  origin: "https://www.kcmi-rcc.org", // Allow requests from this origin
  methods: ["GET", "POST"], // Allow these HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
};
app.use(cors(corsOptions)); // Apply CORS middleware with the specified options
app.options("*", cors(corsOptions)); // Handle preflight requests for all routes

// Serve static files
app.use(express.static(path.join(__dirname, "../public"))); // Serve static files from the 'public' directory

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // smtp.zoho.com
  port: Number(process.env.SMTP_PORT), // 587
  secure: false, // false for port 587
  requireTLS: true, // Enforce TLS
  auth: {
    user: process.env.SMTP_USER, // admin@kcmi-rcc.org
    pass: process.env.SMTP_PASS, // Zoho app password
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

  // Validate phone number format
  if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone format" });
  }

  // Configure email options
  const mailOptions = {
    from: process.env.SMTP_USER, // Sender address
    to: "kcmi.forms@gmail.com", // Recipient address
    subject: "New Contact-Us Form Request", // Email subject
    text: `Email: ${email}\nPhone: ${phone || "Not provided"}\nMessage: ${
      message || "No message provided"
    }`, // Email body
  };

  // Configure auto-reply email options
  const autoReplyMailOptions = {
    from: process.env.SMTP_USER, // Sender address
    to: email, // Recipient address (original sender)
    subject: "Thank you for contacting KCMI!", // Email subject
    text: "We have received your message and will get back to you shortly.\n\nGod bless you!\nKCMI Team", // Email body
  };

  try {
    await transporter.sendMail(mailOptions); // Send the main email
    await transporter.sendMail(autoReplyMailOptions); // Send the auto-reply email
    res.json({ success: true, message: "Message sent successfully!" }); // Send success response
  } catch (error) {
    console.error("Email failed:", error); // Log email sending error
    res.status(500).json({ success: false, message: "Error sending message" }); // Send error response
  }
});

// Handle Subscription Form Submission
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
      const whatsappLink = `https://wa.me/+2349134448322?text=Subscribe`; // WhatsApp subscription link

      // Configure email options for WhatsApp subscription
      await transporter.sendMail({
        from: process.env.SMTP_USER, // Sender address
        to: email, // Recipient address
        subject: "Join Daily Faith Recharge on WhatsApp", // Email subject
        text: `Click here to join our WhatsApp broadcast: ${whatsappLink}\n\nGod bless you!\nKCMI Team`, // Email body
      });

      res.json({ success: true, message: "WhatsApp subscription link sent!" }); // Send success response
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid subscription type" }); // Send error response for invalid subscription type
    }
  } catch (error) {
    console.error("Subscription failed:", error); // Log subscription error
    res.status(500).json({ success: false, message: "Error subscribing" }); // Send error response
  }
});

// Database Connection Check
app.get("/api/db-check", async (req, res) => {
  try {
    const connection = await pool.getConnection(); // Get a database connection from the pool
    await connection.ping(); // Ping the database to check the connection
    connection.release(); // Release the connection back to the pool
    res.json({ success: true, message: "Database connection successful!" }); // Send success response
  } catch (error) {
    console.error("Database connection failed:", error); // Log database connection error
    res
      .status(500)
      .json({ success: false, message: "Database connection error" }); // Send error response
  }
});

// Livestream Routes
const livestreamRoutes = require("../api/livestream"); // Import livestream routes
app.use("/api/livestream", livestreamRoutes); // Mount livestream routes under '/api/livestream'

// Google Calendar API Setup
const calendarCache = new NodeCache({
  stdTTL: 1800, // 30 minutes
  checkperiod: 300, // 5 minutes
});

// Initialize OAuth2 client
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground" // Redirect URL for OAuth2
);

// Set refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Middleware to verify calendar authentication
async function verifyCalendarAuth() {
  if (
    !oauth2Client.credentials.access_token ||
    oauth2Client.credentials.expiry_date < Date.now()
  ) {
    console.log("Refreshing expired access token...");
    await oauth2Client.refreshAccessToken();
  }
}

// Calendar API route with OAuth 2.0
app.get("/api/calendar-events", async (req, res) => {
  try {
    await verifyCalendarAuth();
    // Check cache first
    const cachedEvents = calendarCache.get("events");
    if (cachedEvents) {
      res.set("X-Cache", "HIT");
      return res.json(cachedEvents);
    }

    // Get new access token
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
    } catch (err) {
      console.error("Error refreshing access token:", err);
      throw err;
    }

    const calendar = google.calendar({
      version: "v3",
      auth: oauth2Client,
    });

    // Fetch events
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

    // Cache the results
    calendarCache.set("events", events);
    res.set("X-Cache", "MISS");
    res.set("Cache-Control", "public, max-age=900");
    res.json(events);
  } catch (error) {
    console.error("Calendar API error:", error);
    let errorMessage = "Failed to fetch calendar events";
    if (error.code === 403) {
      errorMessage = "Calendar API quota exceeded";
    } else if (error.message.includes("invalid_grant")) {
      errorMessage = "Authentication expired - needs new refresh token";
    }

    // Try to return stale cache if available
    const staleEvents = calendarCache.get("events");
    if (staleEvents) {
      return res.json({
        events: staleEvents,
        warning: "Showing cached data due to: " + errorMessage,
      });
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message,
    });
  }
});

// Add rate limiting to the calendar API route
// This will limit the number of requests to 100 per 15 minutes per IP address
// This is useful to prevent abuse and ensure fair usage of the API
// Rate Limiting Middleware

const rateLimit = require("express-rate-limit");
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
    // Generate JWT with expiration time (1 minute)
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: "1m",
    }); // Updated expiration time
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Google Drive API route
app.get("/api/drive-file", async (req, res) => {
  try {
    const { fileId } = req.query;
    if (!fileId) return res.status(400).json({ error: "File ID required" });

    await verifyCalendarAuth();

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    const { google } = require("googleapis");
    const fetch = require("node-fetch");

    async function getTokenInfo(accessToken) {
      const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("TokenInfo Response:", data); // Log the TokenInfo response
        return data;
      } catch (error) {
        console.error("Error fetching TokenInfo:", error);
        return null;
      }
    }

    const response = await drive.files.get({
      fileId,
      fields: "webViewLink,webContentLink,name,mimeType",
    });

    res.json(response.data);
  } catch (error) {
    console.error("Drive API error:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

// Serve Drive manifest file
app.get("/api/drive-manifest", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Manifest ID required" });

    await verifyCalendarAuth();

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    // Get the access token from the oauth2Client
    const accessToken = await oauth2Client.getAccessToken();

    // Call the TokenInfo endpoint and log the response
    const tokenInfo = await getTokenInfo(accessToken.token);

    // Now, try to access the Google Drive file
    const manifestResponse = await drive.files.get({
      fileId: "1QnJQXur7zNvqoks7TR5SRRgVqWlZdACO",
      alt: "media",
    });

    res.json(manifestResponse.data);
  } catch (error) {
    console.error("Error fetching manifest:", error);
    res.status(500).send("Error fetching manifest");
  }
});

// Start Server
const PORT = process.env.PORT || 5000; // Get port from environment variables or use 5000 as default
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); // Start the server and log the port

// Test Database Connection
async function testDB() {
  try {
    console.log("Testing database connection...");
    const [rows] = await pool.execute("SELECT 1"); // Execute a simple query to test the connection
    console.log("✅ Database connected successfully!", rows); // Log success message
  } catch (error) {
    console.error("❌ Database connection failed!", error); // Log connection error
  }
}

testDB(); // Call the function to test the database connection
