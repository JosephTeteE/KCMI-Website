// server/server.js

// Import Required Modules
const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db");
const nodemailer = require("nodemailer");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(express.json());

// CORS Configuration
const corsOptions = {
  origin: "https://kcmi-website.vercel.app",
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
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// reCAPTCHA Verification
async function verifyRecaptcha(token, formType) {
  try {
    const secretKey =
      formType === "contact"
        ? process.env.RECAPTCHA_SECRET_KEY_CONTACT
        : process.env.RECAPTCHA_SECRET_KEY_SUBSCRIPTION;

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

  if (!(await verifyRecaptcha(recaptchaToken, "contact"))) {
    return res
      .status(400)
      .json({ success: false, message: "reCAPTCHA failed" });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Valid email required" });
  }
  if (phone && !/^\+?[0-9\s-]+$/.test(phone)) {
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
    res.json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("Email failed:", error);
    res.status(500).json({ success: false, message: "Error sending message" });
  }
});

// Handle Subscription Form Submission
app.post("/subscribe", async (req, res) => {
  const { email, subscriptionType, recaptchaToken } = req.body;

  if (!(await verifyRecaptcha(recaptchaToken, "subscription"))) {
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
      const whatsappLink = `https://wa.me/+2348084583102?text=Subscribe`;

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Join Daily Faith Recharge on WhatsApp",
        text: `Click here to join our WhatsApp broadcast: ${whatsappLink}\n\nThank you!\nKCMI Team`,
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

// Livestream Routes
const livestreamRoutes = require("../api/livestream");
app.use("/api/livestream", livestreamRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
