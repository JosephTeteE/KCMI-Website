// server/server.ts

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { TransportOptions } from 'nodemailer';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';
import { google } from 'googleapis';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';

// Import your database pool configuration
import { pool } from './db';

dotenv.config();

// =========================================
// === GOOGLE AUTH SETUP ===
// =========================================
import { GoogleAuth } from 'google-auth-library';

// Check if the Base64 credential is provided
if (!process.env.GOOGLE_CREDENTIALS_BASE64) {
  throw new Error("GOOGLE_CREDENTIALS_BASE64 environment variable not set.");
}

// Decode the Base64 credential
const decodedCredentials = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
const credentials = JSON.parse(decodedCredentials);

// Initialize GoogleAuth with the decoded credentials
const auth = new GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});
let authClient: any;
async function initializeGoogleAuth() {
  authClient = await auth.getClient();
  google.options({ auth: authClient });
}

// =========================================
// Type Definitions
// =========================================
interface MediaInfo {
  id: string | null;
  source: 'youtube' | 'drive' | null;
}

interface SheetEvent {
  title: string;
  type: 'video' | 'image' | 'pdf';
  fileId: string | null;
  videoSource: 'youtube' | 'drive' | null;
  description: string;
  date: string;
  endDate: string;
  location: string;
  notes: string;
  buttonText: string;
  buttonLink: string;
  times: {
    allday?: boolean;
    morning?: string;
    afternoon?: string;
    evening?: string;
  } | null;
  contact: {
    details: string;
    instructions: string;
  } | null;
}

const app = express();

app.set('trust proxy', 1);

// =========================================
// Environment Variable Check
// =========================================
const requiredEnvVars: string[] = [
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "CALENDAR_ID", "JWT_SECRET",
  "GOOGLE_API_KEY", "RECAPTCHA_SECRET_KEY_YOUTH", "RECAPTCHA_SECRET_KEY_CONTACT", 
  "GOOGLE_DRIVE_RECEIPTS_FOLDER_ID", "GOOGLE_SHEET_REGISTRATIONS_ID", 
  "KCMI_ADMIN_EMAIL", "AD_USER", "AD_PASS", "GOOGLE_CREDENTIALS_BASE64"
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingVars);
  process.exit(1);
}

// =========================================
// Middleware & Initial Setup
// =========================================
const corsOptions: cors.CorsOptions = {
  origin: ["https://www.kcmi-rcc.org", "https://kcmi-rcc.org", "https://camp.kcmi-rcc.org"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use((req: Request, _res: Response, next: NextFunction) => {
  try {
    req.url = decodeURIComponent(req.url);
  } catch (e) {
    if (e instanceof Error) console.warn("URL decoding failed:", e.message);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// =========================================
// Service Configurations
// =========================================

// Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT!),
  secure: false, // true for 465, false for other ports
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
} as TransportOptions);

transporter.verify((error) => {
  if (error) {
    console.error("❌ Nodemailer transporter verification failed:", error);
  } else {
    console.log("✅ Nodemailer transporter ready to send emails.");
  }
});

// Multer (File Uploads)
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, GIF, and PDF are allowed."));
    }
  },
});

// =========================================
// Helper Functions
// =========================================
async function verifyRecaptcha(token: string, secretKey: string): Promise<boolean> {
  try {
    const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
      params: { secret: secretKey, response: token },
    });
    return response.data.success;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toISOString().split("T")[0];
}

function formatTime(timeString: string): string {
  if (!timeString) return "";
  return timeString.replace(/(\d+)([ap]m)/i, "$1:00 $2").replace(/([ap]m)/i, (match) => match.toUpperCase());
}

function extractMediaInfo(url: string): MediaInfo {
  if (!url) return { id: null, source: null };
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const driveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) return { id: youtubeMatch[1], source: "youtube" };
  const driveMatch = url.match(driveRegex);
  if (driveMatch) return { id: driveMatch[1], source: "drive" };
  return { id: url, source: "drive" }; // Fallback
}

// =========================================
// API Endpoints
// =========================================

app.post("/submit-contact", async (req: Request, res: Response) => {
  const { email, phone, message, recaptchaToken } = req.body;
  if (!(await verifyRecaptcha(recaptchaToken, process.env.RECAPTCHA_SECRET_KEY_CONTACT!))) {
    return res.status(400).json({ success: false, message: "reCAPTCHA verification failed. Please try again." });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Valid email required" });
  }
  if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) {
    return res.status(400).json({ success: false, message: "Invalid phone format" });
  }
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: "kcmi.forms@gmail.com",
    subject: "New Contact-Us Form Request",
    text: `Email: ${email}\nPhone: ${phone || "Not provided"}\nMessage: ${message || "No message provided"}`,
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

app.post("/subscribe", async (req: Request, res: Response) => {
  const { email, subscriptionType, recaptchaToken } = req.body;
  if (!(await verifyRecaptcha(recaptchaToken, process.env.RECAPTCHA_SECRET_KEY_CONTACT!))) {
    return res.status(400).json({ success: false, message: "reCAPTCHA verification failed. Please try again." });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Valid email required" });
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
      res.status(400).json({ success: false, message: "Invalid subscription type" });
    }
  } catch (error) {
    console.error("Subscription failed:", error);
    res.status(500).json({ success: false, message: "Error subscribing" });
  }
});

app.get("/api/db-check", async (_req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ success: true, message: "Database connection successful!" });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({ success: false, message: "Database connection error" });
  }
});

// Health Check Endpoint for server
if (process.env.ENABLE_PING_ROUTE === "true") {
  app.get("/ping", (req: Request, res: Response) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("Ping received at", new Date().toISOString());
    }
    res.send("pong");
  });
}

// DB Keep-Alive Ping (to prevent Aiven service sleep due to free-tier limitations)
app.get("/api/db-keepalive", async (req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    await connection.query("SELECT 1"); // lightweight ping
    connection.release();
    res.json({ success: true, message: "DB keep-alive success" });
  } catch (error) {
    console.error("DB keep-alive failed:", error);
    res.status(500).json({ success: false, message: "DB keep-alive error" });
  }
});

import livestreamRoutes from '../api/livestream';
app.use("/api/livestream", livestreamRoutes);

app.post("/api/auth", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (username === process.env.AD_USER && password === process.env.AD_PASS) {
    const token = jwt.sign({ username }, process.env.JWT_SECRET!, { expiresIn: "1m" });
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

const calendarCache = new NodeCache({ stdTTL: 1800, checkperiod: 300 });
const calendarLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.get("/api/calendar-events", calendarLimiter, async (_req: Request, res: Response) => {
  try {
    const cachedEvents = calendarCache.get<any[]>("events");
    if (cachedEvents) {
      return res.set("X-Cache", "HIT").json(cachedEvents);
    }
    const calendar = google.calendar({ version: "v3" });

    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);
    const response = await calendar.events.list({
      calendarId: process.env.CALENDAR_ID!,
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });
    const events = response.data.items || [];
    calendarCache.set("events", events);
    res.set("X-Cache", "MISS").set("Cache-Control", "public, max-age=900").json(events);
  } catch (error) {
    console.error("Calendar API error:", error);
    const staleEvents = calendarCache.get("events");
    if (staleEvents) {
      return res.json({ events: staleEvents, warning: "Showing cached data due to API error" });
    }
    res.status(500).json({ error: "Failed to fetch calendar events", details: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/api/drive-manifest", async (req: Request, res: Response) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Manifest ID required" });
  try {
    const drive = google.drive({ version: "v3" });
    await drive.files.get({ fileId: id as string, fields: "id,name" });
    const response = await drive.files.get({ fileId: id as string, alt: "media" }, { responseType: "json" });
    res.json(response.data);
  } catch (error: any) {
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
    res.status(statusCode).json({ error: errorMessage, details: error.message });
  }
});

app.get("/api/sheets-events", async (req: Request, res: Response) => {
    let id = req.query.id as string | undefined;

    if (!id && req.url.includes("id=")) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            id = url.searchParams.get("id") ?? undefined;
        } catch (e) {
            if (e instanceof Error) console.error("Could not parse ID from malformed URL:", e.message);
        }
    }

    if (!id) {
        return res.status(400).json({ error: "Sheet ID is required." });
    }

    try {
        const sheets = google.sheets({ version: "v4" });
        const response = await sheets.spreadsheets.values.get({ spreadsheetId: id, range: "A1:P100" });
        const rows = response.data.values as string[][];

        if (!rows || rows.length < 2) return res.json([]);

        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
        const getColumnIndex = (name: string) => headers.indexOf(name.toLowerCase().replace(/\s+/g, ''));

        const col = {
            title: getColumnIndex("EventTitle"),
            type: getColumnIndex("EventType"),
            mediaLink: getColumnIndex("MediaLink"),
            description: getColumnIndex("Description"),
            startDate: getColumnIndex("StartDate"),
            endDate: getColumnIndex("EndDate"),
            allDay: getColumnIndex("AllDay"),
            morning: getColumnIndex("MorningTime"),
            afternoon: getColumnIndex("AfternoonTime"),
            evening: getColumnIndex("EveningTime"),
            location: getColumnIndex("Location"),
            contactDetails: getColumnIndex("ContactDetails"),
            contactInstructions: getColumnIndex("ContactInstructions"),
            notes: getColumnIndex("Notes"),
            btnText: getColumnIndex("ButtonText"),
            btnLink: getColumnIndex("ButtonLink"),
        };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const events: SheetEvent[] = rows.slice(1).map(row => {
            const eventEndDateStr = row[col.endDate] || row[col.startDate];
            if (!eventEndDateStr) return null;

            const eventEndDate = new Date(eventEndDateStr);
            if (isNaN(eventEndDate.getTime())) return null;
            eventEndDate.setHours(23, 59, 59, 999);
            if (eventEndDate < today) return null;

            const { id: fileId, source: videoSource } = extractMediaInfo(row[col.mediaLink] || "");

            const times: SheetEvent['times'] = {};
            if (row[col.allDay]?.toLowerCase() === 'true' || row[col.allDay]?.toLowerCase() === 'yes') {
                times.allday = true;
            } else {
                if (row[col.morning]) times.morning = formatTime(row[col.morning]);
                if (row[col.afternoon]) times.afternoon = formatTime(row[col.afternoon]);
                if (row[col.evening]) times.evening = formatTime(row[col.evening]);
            }
            
            const contact: SheetEvent['contact'] = {
                details: row[col.contactDetails] || "",
                instructions: row[col.contactInstructions] || "",
            };

            return {
                title: row[col.title] || "Untitled Event",
                type: (row[col.type]?.toLowerCase() as SheetEvent['type']) || 'pdf',
                fileId,
                videoSource,
                description: row[col.description] || "",
                date: formatDate(row[col.startDate]),
                endDate: formatDate(row[col.endDate] || row[col.startDate]),
                times: Object.keys(times).length > 0 ? times : null,
                contact: contact.details ? contact : null,
                location: row[col.location] || "",
                notes: row[col.notes] || "",
                buttonText: row[col.btnText] || "",
                buttonLink: row[col.btnLink] || "",
            };
        }).filter((event): event is SheetEvent => event !== null);

        res.json(events);
    } catch (error) {
        if (error instanceof Error) {
            console.error("Sheets API Error:", error.message);
            res.status(500).json({ error: "Failed to load events", details: error.message });
        }
    }
});

const mapCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const mapLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: "Too many map requests, please try again later" });
app.get("/api/maps-proxy", mapLimiter, async (_req: Request, res: Response) => {
  const cacheKey = "mapConfig";
  const cachedData = mapCache.get(cacheKey);
  if (cachedData) return res.set("X-Cache", "HIT").json(cachedData);

  try {
    const mapConfig = {
      churchLocation: { lat: 4.831148938457418, lng: 7.01167364093468 },
      zoom: 16,
      apiKey: process.env.GOOGLE_API_KEY!,
    };
    mapCache.set(cacheKey, mapConfig);
    res.set("X-Cache", "MISS").json(mapConfig);
  } catch (error) {
    console.error("Map proxy error:", error);
    res.status(500).json({ error: "Failed to load map data", details: error instanceof Error ? error.message : "Unknown error" });
  }
});


// KCMI Youth/Teens Camp Registration Endpoint
app.post("/api/camp-registration", multer().none(), async (req: Request, res: Response) => {
    
    // --- File Upload to Cloudinary ---
    const { fullName, email, phoneNumber, numPeople, recaptchaToken, paymentReceiptUrl } = req.body;

    // --- 1. Validation ---
    if (!fullName || !email || !phoneNumber || !numPeople || !paymentReceiptUrl) {
      return res.status(400).json({ success: false, message: "All form fields, including the receipt, are required." });
    }
    const parsedNumPeople = parseInt(numPeople as string);
    if (isNaN(parsedNumPeople) || parsedNumPeople < 1) {
        return res.status(400).json({ success: false, message: "Invalid number of people." });
    }
    if (!(await verifyRecaptcha(recaptchaToken, process.env.RECAPTCHA_SECRET_KEY_YOUTH!))) {
      return res.status(400).json({ success: false, message: "reCAPTCHA verification failed. Please try again." });
    }

    try {
        const sheets = google.sheets({ version: "v4" });
        const sheetId = process.env.GOOGLE_SHEET_REGISTRATIONS_ID!;
        const submissionId = crypto.randomBytes(10).toString("hex");

        // --- 2. Prepare Data for Google Sheet ---
        const rowData = [
          new Date().toLocaleString("en-NG", { timeZone: "Africa/Lagos" }),
          fullName,
          email,
          phoneNumber,
          parsedNumPeople,
          paymentReceiptUrl,
          submissionId,
        ];

        // --- 3. Append to Google Sheet ---
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: "Sheet1!A1",
          valueInputOption: "RAW",
          requestBody: { values: [rowData] },
        });

        // --- 4. Send Automated Confirmation Email ---
        const emailHtml = `
          <h1>Thank you for registering for KCMI Youth/Teens Camp 2025!</h1>
          <p>Hello ${fullName},</p>
          <p>Your registration has been confirmed. Please keep this email for your records.</p>
          <p><strong>Submission ID:</strong> ${submissionId}</p>
          <p>You can view your submitted payment receipt by clicking the link below:</p>
          <a href="${paymentReceiptUrl}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            View My Receipt
          </a>
          <br><br>
          <p>We look forward to seeing you there!</p>
          <p>God bless you,<br>KCMI Team</p>
        `;

        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: "KCMI Youth/Teens Camp 2025 Registration Confirmation",
          html: emailHtml,
        });

        res.json({ success: true, message: "Registration successful!" });

    } catch (error) {
        console.error("Camp registration error:", error);
        res.status(500).json({ success: false, message: "A server error occurred. Please try again later." });
    }
});

// =========================================
// Final Middleware & Server Start
// =========================================
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://www.google.com https://www.gstatic.com https://drive.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https:; " +
      "frame-src 'self' https://www.google.com https://drive.google.com https://www.youtube.com; " +
      "font-src 'self' https://fonts.gstatic.com"
  );
  next();
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    // Clean up uploaded file if present
    if ((req as any).file && fs.existsSync((req as any).file.path)) {
        fs.unlink((req as any).file.path, (unlinkErr) => {
            if (unlinkErr) console.error("Error deleting temp file on unhandled error:", unlinkErr);
        });
    }
    res.status(500).json({ error: "Internal server error", details: err.message });
});

const PORT = process.env.PORT || 5000;

(async () => {
  await initializeGoogleAuth();

  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      console.log("✅ Database connected successfully!");
  } catch (error) {
      if (error instanceof Error) console.error("❌ Database connection failed!", error);
  }
})();