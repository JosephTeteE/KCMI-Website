// server/server.js

// Import Required Modules
const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db");
const nodemailer = require("nodemailer");
const axios = require("axios");

dotenv.config(); // Load environment variables

const app = express();
app.use(express.json()); // Parse JSON request bodies

// CORS Configuration
const corsOptions = {
  origin: "https://kcmi-website.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

const isProduction = process.env.NODE_ENV === "production";

// Ensure essential environment variables are set in production
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

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Validation Helpers
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^\+?[0-9\s-]+$/.test(phone);

// reCAPTCHA Verification
async function verifyRecaptcha(token) {
  if (!isProduction) {
    console.log("Skipping reCAPTCHA verification in development.");
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

  if (!(await verifyRecaptcha(recaptchaToken))) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA failed" });
  }
  if (!email || !isValidEmail(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email required" });
  }
  if (phone && !isValidPhone(phone)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid phone format" });
  }

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: "kcmiworldwide.church@gmail.com",
    subject: "New Contact-Us Form Request",
    text: `Email: ${email}\nPhone: ${phone || "Not provided"}\nMessage: ${
      message || "No message provided"
    }`,
  };

  const autoReplyMailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Thank you for contacting KCMI!",
    text: "We have received your message and will get back to you shortly.\n\nBlessings,\nKCMI Team",
  };

  try {
    await transporter.sendMail(mailOptions);
    await transporter.sendMail(autoReplyMailOptions);

    await pool.execute(
      "INSERT INTO contact_messages (email, phone, message) VALUES (?,?,?)",
      [email, phone || "Not provided", message]
    );

    res.json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("Email failed:", error);
    res.status(500).json({ success: false, message: "Error sending message" });
  }
});

// Handle Subscription Form Submission
app.post("/subscribe", async (req, res) => {
  const { email, recaptchaToken } = req.body;

  if (!(await verifyRecaptcha(recaptchaToken))) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA failed" });
  }
  if (!email || !isValidEmail(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email required" });
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: "kcmiworldwide.church@gmail.com",
      subject: "New Subscription Request",
      text: `New subscriber: ${email}`,
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Welcome to Daily Faith Recharge!",
      text: "Thank you for subscribing! You'll receive our daily devotionals.\n\nBlessings,\nKCMI Team",
    });

    res.json({ success: true, message: "Subscription successful!" });
  } catch (error) {
    console.error("Subscription failed:", error);
    res.status(500).json({ success: false, message: "Error subscribing" });
  }
});

// Livestream Routes
const livestreamRoutes = require("../api/livestream");
app.use("/api/livestream", livestreamRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
