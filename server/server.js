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

dotenv.config(); // Load environment variables

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
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_ENCRYPTION === "tls",
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
    text: "We have received your message and will get back to you shortly.\n\nBlessings,\nKCMI Team", // Email body
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
      const whatsappLink = `https://wa.me/+2348084583102?text=Subscribe`; // WhatsApp subscription link

      // Configure email options for WhatsApp subscription
      await transporter.sendMail({
        from: process.env.SMTP_USER, // Sender address
        to: email, // Recipient address
        subject: "Join Daily Faith Recharge on WhatsApp", // Email subject
        text: `Click here to join our WhatsApp broadcast: ${whatsappLink}\n\nThank you!\nKCMI Team`, // Email body
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

// Start Server
const PORT = process.env.PORT || 5000; // Get port from environment variables or use 5000 as default
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
