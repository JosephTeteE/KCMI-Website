// server/server.js
// Import Required Modules
const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db");
const nodemailer = require("nodemailer");
const axios = require("axios");

dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(express.json()); // Parse JSON request bodies

// CORS Configuration - Important: Adjust origin for production
app.use(
  cors({
    origin: "https://kcmi-website.vercel.app", // Your frontend domain
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../public")));

const isProduction = process.env.NODE_ENV === "production";

// Check if essential environment variables are set for production
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

// Nodemailer Transporter for Sending Emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper Functions for Validation
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^\+?[0-9\s-]+$/.test(phone);

// reCAPTCHA Verification (Conditional)
async function verifyRecaptcha(token) {
  if (!isProduction) {
    console.log("reCAPTCHA verification skipped in development.");
    return true;
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
    to: "kcmiworldwide.church@gmail.com", // Make sure this is correct
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
      "INSERT INTO contact_messages (email, phone, message) VALUES (?,?,?)",
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

// Import and Mount Livestream Routes
const livestreamRoutes = require("../api/livestream");
app.use("/api/livestream", livestreamRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
