// Import Required Modules
const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db");
const nodemailer = require("nodemailer");
const axios = require("axios"); // For reCAPTCHA verification

dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(express.json()); // Parse JSON request bodies
app.use(cors({ origin: "https://yourdomain.com" })); // Allow only specific frontend origins.  Change this in production!
app.use(express.static(path.join(__dirname, "../public"))); // Serve static files

const isProduction = process.env.NODE_ENV === "production";

// Check if essential environment variables are set *for production*
if (
  isProduction &&
  (!process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.RECAPTCHA_SECRET_KEY)
) {
  console.error("Missing SMTP or reCAPTCHA configuration in .env file.");
  process.exit(1);
}

// Nodemailer Transporter for Sending Emails via Gmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // smtp.gmail.com
  port: Number(process.env.SMTP_PORT) || 465, // 465 for SSL, 587 for TLS
  secure: process.env.SMTP_PORT == 465, // true for SSL, false for TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to Validate Email Format
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Function to Validate Phone Number (Basic)
const isValidPhone = (phone) => /^\+?[0-9\s-]+$/.test(phone);

// Function to Verify Google reCAPTCHA Token (Conditional)
async function verifyRecaptcha(token) {
  if (!isProduction) {
    console.log("reCAPTCHA verification skipped in development.");
    return true; // Bypass reCAPTCHA in development
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        },
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

  // Verify reCAPTCHA token (conditionally)
  const isHuman = await verifyRecaptcha(recaptchaToken);
  if (!isHuman) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA verification failed" });
  }

  // Validate email format
  if (!email || !isValidEmail(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email is required" });
  }

  // Validate phone number if provided
  if (phone && !isValidPhone(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone number format" });
  }

  // Define email options
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: "kcmiworldwide.church@gmail.com", //  Make sure this is correct
    subject: "New Contact-Us Form Request",
    text: `Email: ${email}\nPhone: ${phone || "Not provided"}\nMessage: ${
      message || "No message provided"
    }`,
  };

  const autoReplyMailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Thank you for contacting KCMI!",
    text: "Dear Friend,\n\nWe have received your message and will get back to you shortly.\n\nBlessings,\nKCMI Team",
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(autoReplyMailOptions);

    // Store message in MySQL database (optional)
    await pool.execute(
      "INSERT INTO contact_messages (email, phone, message) VALUES (?, ?, ?)",
      [email, phone || "Not provided", message]
    );

    res.json({
      success: true,
      message: "Your message has been sent successfully!",
    });
  } catch (error) {
    console.error(`Email failed: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Error sending message. Please try again later.",
    });
  }
});

// Handle Subscription Form Submission
app.post("/subscribe", async (req, res) => {
  const { email, recaptchaToken } = req.body;

  // Verify reCAPTCHA token (conditionally)
  const isHuman = await verifyRecaptcha(recaptchaToken);
  if (!isHuman) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA verification failed" });
  }

  // Validate email
  if (!email || !isValidEmail(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email is required" });
  }

  try {
    // Send notification email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: "kcmiworldwide.church@gmail.com", // Make sure this is correct
      subject: "New Subscription Request",
      text: `New subscriber: ${email}`,
    });

    // Send welcome email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Welcome to Daily Faith Recharge!",
      text: "Thank you for subscribing! You'll receive our daily devotionals.\n\nBlessings,\nKCMI Team",
    });

    res.json({
      success: true,
      message: "Subscription successful! Thank you for subscribing.",
    });
  } catch (error) {
    console.error(`Subscription failed: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Error subscribing. Please try again later.",
    });
  }
});

// Livestream Routes
app.post("/api/livestream", async (req, res) => {
  const { embedCode } = req.body;

  if (!embedCode) {
    return res.status(400).json({ message: "Embed code is required" });
  }

  try {
    await pool.execute(
      "REPLACE INTO livestream (id, embed_code) VALUES (1, ?)",
      [embedCode]
    );
    console.log("Updated embed code:", embedCode);
    res.json({ message: "Livestream embed updated successfully" });
  } catch (error) {
    console.error("Database Error:", error);
    res
      .status(500)
      .json({ message: "Database error occurred", error: error.message });
  }
});

app.get("/api/livestream", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT embed_code FROM livestream WHERE id = 1"
    );
    const embedCode = rows.length > 0 ? rows[0].embed_code : "";
    console.log("Retrieved embed code:", embedCode);
    res.json({ embedCode });
  } catch (error) {
    console.error("Database Error:", error);
    res
      .status(500)
      .json({ message: "Database error occurred", error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
