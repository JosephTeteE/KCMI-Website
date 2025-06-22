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
const multer = require("multer");
const fs = require("fs");
const crypto = require("crypto");

dotenv.config();

const app = express();

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
  "RECAPTCHA_SECRET_KEY_YOUTH",
  "RECAPTCHA_SECRET_KEY_CONTACT",
  "GOOGLE_DRIVE_RECEIPTS_FOLDER_ID",
  "GOOGLE_SHEET_REGISTRATIONS_ID",
  "KCMI_ADMIN_EMAIL",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("Missing required environment variables:", missingVars);
  process.exit(1);
}

// ==========================================================================
// CORS Configuration
// Allow requests from frontend domains. Crucial for security.
// ==========================================================================
const corsOptions = {
  origin: ["https://www.kcmi-rcc.org", "https://kcmi-rcc.org"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests for all routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

// ==========================================================================
// Nodemailer Configuration
// Purpose: Setup for sending emails through SMTP
// ==========================================================================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("Nodemailer transporter verification failed:", error);
  } else {
    console.log("Nodemailer transporter ready to send emails.");
  }
});

// ==========================================================================
// Google OAuth2 Client Configuration
// Ensures refresh token has permissions for Drive (file) and Sheets (spreadsheet) scopes.
// ==========================================================================
const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI ||
    "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,

  scope: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
  ].join(" "),
});

// Function to verify and refresh Google API token (used by multiple routes)
async function verifyGoogleAuth() {
  try {
    if (
      !oauth2Client.credentials.access_token ||
      oauth2Client.credentials.expiry_date < Date.now()
    ) {
      console.log("Refreshing Google API access token...");
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      console.log("Google API token refreshed successfully.");
    }
    return true;
  } catch (error) {
    console.error("Error refreshing Google API token:", error.message);
    throw new Error("Authentication with Google API failed.");
  }
}

// ==========================================================================
// reCAPTCHA Verification Functions
// ==========================================================================
async function verifyRecaptchaContact(token) {
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
    console.error("Contact Form reCAPTCHA verification failed:", error);
    return false;
  }
}

async function verifyRecaptchaCamp(token) {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY_YOUTH;
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: { secret: secretKey, response: token },
      }
    );

    return response.data.success;
  } catch (error) {
    console.error("Camp Form reCAPTCHA verification failed:", error);
    return false;
  }
}

// ==========================================================================
// Contact Form Submission Handler (Using verifyRecaptchaContact)
// ==========================================================================
app.post("/submit-contact", async (req, res) => {
  const { email, phone, message, recaptchaToken } = req.body;

  if (!(await verifyRecaptchaContact(recaptchaToken))) {
    // Use specific function
    return res.status(400).json({
      success: false,
      message: "reCAPTCHA verification failed. Please try again.",
    });
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

  if (!(await verifyRecaptchaContact(recaptchaToken))) {
    // Use specific function
    return res.status(400).json({
      success: false,
      message: "reCAPTCHA verification failed. Please try again.",
    });
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
// Google Calendar API Setup
// Purpose: Configures OAuth2 for Google Calendar and implements caching
// ==========================================================================
const calendarCache = new NodeCache({
  stdTTL: 1800, // Cache events for 30 minutes
  checkperiod: 300, // Check for expired cache every 5 minutes
});

// Use verifyGoogleAuth for this route
app.get("/api/calendar-events", async (req, res) => {
  try {
    await verifyGoogleAuth(); // Ensure OAuth2 token is valid before making API calls

    // Check cache first
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

// Rate Limiting for Calendar API
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

// ==========================================================================
// Google Drive Manifest Endpoint
// Purpose: Retrieves manifest files from Google Drive
// ==========================================================================
app.get("/api/drive-manifest", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Manifest ID required" });

    await verifyGoogleAuth();

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    await drive.files.get({
      fileId: id,
      fields: "id,name",
    });

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
// Multer Configuration for File Uploads
// ==========================================================================
const upload = multer({
  dest: "uploads/", // Temporary directory for storing files
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only images (JPG, PNG, GIF) and PDFs are allowed."
        ),
        false
      );
    }
  },
});

// ==========================================================================
// Youth Camp Registration Handler (NEW)
// Purpose: Processes youth camp registrations including file upload to Google Drive
// and data storage in Google Sheets.
// ==========================================================================
app.post(
  "/api/camp-registration",
  upload.single("paymentReceipt"),
  async (req, res) => {
    const { fullName, email, phoneNumber, numPeople, recaptchaToken } =
      req.body;
    const file = req.file;

    // --- Initial Validation & reCAPTCHA ---
    if (!fullName || !email || !phoneNumber || !numPeople || !file) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: "All fields are required, including payment receipt.",
      });
    }

    const parsedNumPeople = parseInt(numPeople);
    if (isNaN(parsedNumPeople) || parsedNumPeople < 1) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: "Number of people must be at least 1.",
      });
    }

    if (parsedNumPeople > 10) {
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message:
          "Maximum 10 people per registration. For larger groups, please contact us.",
      });
    }

    if (!(await verifyRecaptchaCamp(recaptchaToken))) {
      // Use the NEW reCAPTCHA function
      if (file) fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        message: "reCAPTCHA verification failed. Please try again.",
      });
    }

    let driveFileUrl = null;
    const submissionId = crypto.randomBytes(10).toString("hex"); // Generate a unique ID

    try {
      // --- Google Drive Upload ---
      await verifyGoogleAuth(); // Ensure OAuth2 token is refreshed for Drive

      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const fileMetadata = {
        name: `${new Date().toISOString().slice(0, 10)}_${fullName.replace(
          /\s/g,
          "_"
        )}_Receipt_${submissionId}.${file.originalname.split(".").pop()}`,
        parents: [process.env.GOOGLE_DRIVE_RECEIPTS_FOLDER_ID],
      };

      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      };

      const driveResponse = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id,webViewLink",
      });

      driveFileUrl = driveResponse.data.webViewLink;
      console.log(
        `File uploaded to Google Drive: ${driveFileUrl} for submission ID: ${submissionId}`
      );

      // --- Google Sheets Insertion (Duplicate Check First) ---
      const sheets = google.sheets({ version: "v4", auth: oauth2Client });
      const sheetId = process.env.GOOGLE_SHEET_REGISTRATIONS_ID;

      // Fetch existing data for duplicate check (checking email and full name)
      const existingDataResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "Sheet1!B:C",
      });
      const existingRows = existingDataResponse.data.values || [];

      const isDuplicate = existingRows.some(
        (row) => row[0] === email && row[1] === fullName
      );

      if (isDuplicate) {
        console.warn(
          `Duplicate registration attempt detected for ${email} - ${fullName}. Deleting uploaded file.`
        );
        await drive.files.delete({ fileId: driveResponse.data.id });
        return res.status(409).json({
          success: false,
          message:
            "You have already registered for this camp with these details. If you believe this is an error, please contact us.",
        });
      }

      const registrationTimestamp = new Date().toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
      });

      const rowData = [
        registrationTimestamp,
        fullName,
        email,
        phoneNumber,
        parsedNumPeople,
        driveFileUrl,
        submissionId,
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        resource: {
          values: [rowData],
        },
      });
      console.log("Registration saved to Google Sheet.");

      // --- Send Confirmation Email to User ---
      const mailOptionsUser = {
        from: process.env.SMTP_USER,
        to: email,
        subject:
          "KCMI Youth/Teens Camp 2025 Registration Confirmation - LEVEL UP",
        html: `
        <p>Dear ${fullName},</p>
        <p>Thank you for registering for the KCMI Youth/Teens Camp 2025: <strong>"LEVEL UP"</strong>!</p>
        <p>We have received your registration for <strong>${parsedNumPeople} person(s)</strong>.</p>
        <p>Your unique Submission ID is: <strong>${submissionId}</strong></p>
        <p>You can view your uploaded payment receipt here: <a href="${driveFileUrl}">${driveFileUrl}</a></p>
        <p>We are excited to have you join us for a transformative experience filled with faith, fun, and fellowship!</p>
        <p>More details regarding the camp schedule and what to bring will be sent closer to the camp date.</p>
        <p>God bless you,</p>
        <p><strong>The KCMI Youth/Teens Team</strong></p>
        <hr>
        <p><small>This is an automated email, please do not reply.</small></p>
      `,
      };

      // --- Send Notification Email to Admin ---
      const mailOptionsAdmin = {
        from: process.env.SMTP_USER,
        to: process.env.KCMI_ADMIN_EMAIL,
        subject: `NEW Youth/Teens Camp Registration: ${fullName} (${email}) - ${parsedNumPeople} people`,
        html: `
            <p>A new KCMI Youth/Teens Camp registration has been submitted:</p>
            <ul>
                <li><strong>Full Name:</strong> ${fullName}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Phone Number:</strong> ${phoneNumber}</li>
                <li><strong>Number of People:</strong> ${parsedNumPeople}</li>
                <li><strong>Payment Receipt:</strong> <a href="${driveFileUrl}">${driveFileUrl}</a></li>
                <li><strong>Submission ID:</strong> ${submissionId}</li>
                <li><strong>Registration Date:</strong> ${registrationTimestamp}</li>
            </ul>
            <p>Please log in to the Google Sheet to view full details and manage registrations.</p>
            <p>Google Sheet Link: <a href="https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_REGISTRATIONS_ID}/edit">Youth Camp Registrations Sheet</a></p>
        `,
      };

      await transporter.sendMail(mailOptionsUser);
      await transporter.sendMail(mailOptionsAdmin);
      console.log("Confirmation and admin notification emails sent.");

      res.json({ success: true, message: "Registration successful!" });
    } catch (error) {
      console.error("Camp registration error:", error);

      if (error instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: `File upload error: ${error.message}`,
        });
      }
      if (error.message.includes("Authentication with Google API failed")) {
        return res.status(500).json({
          success: false,
          message:
            "Server configuration error: Google API authentication failed. Please contact support.",
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to complete registration. Please try again later.",
      });
    } finally {
      if (file && fs.existsSync(file.path)) {
        fs.unlink(file.path, (err) => {
          if (err) console.error("Error deleting temp file:", err);
          else console.log("Temporary file deleted:", file.path);
        });
      }
    }
  }
);

// ==========================================================================
// Security Middleware
// Purpose: Enhances security with Content Security Policy headers
// ==========================================================================
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://www.google.com https://www.gstatic.com; " + // Added Google reCAPTCHA domains
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https://*.googleapis.com https://*.gstatic.com; " +
      "connect-src 'self' https://*.googleapis.com https://kcmi-backend.onrender.com https://www.google.com; " + // Added Google reCAPTCHA domain for API call
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
  if (req.file && fs.existsSync(req.file.path)) {
    // Clean up temp file on unhandled error too
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr)
        console.error(
          "Error deleting temp file on unhandled error:",
          unlinkErr
        );
    });
  }
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
