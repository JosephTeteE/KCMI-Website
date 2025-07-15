// File: api/livestream.js
// Desc: API routes for updating and retrieving the livestream embed code

const express = require("express");
const pool = require("../dist/server/db"); // Import the database connection pool
const router = express.Router(); // Create a new router instance

// ✅ Middleware to log all incoming requests
router.use((req, res, next) => {
  console.log(`📡 [${req.method}] Request to ${req.originalUrl}`); // Log the HTTP method and URL
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("🔍 Request Body:", req.body); // Log the request body if it exists
  }
  next(); // Pass control to the next middleware or route handler
});

// 🔹 Update Livestream Embed Code
router.post("/", async (req, res) => {
  const { embedCode, isLive } = req.body; // Destructure embedCode and isLive from the request body

  // Validate that embedCode is provided
  if (!embedCode) {
    console.warn("⚠️ Missing embedCode in request");
    return res.status(400).json({ message: "Embed code is required" }); // Respond with a 400 error if embedCode is missing
  }

  console.log("isLive status received:", isLive); // Log the isLive status

  let connection;
  try {
    connection = await pool.getConnection(); // Get a database connection from the pool
    console.log("✅ Connected to database for update");

    // Update or insert the livestream embed code and isLive status
    await connection.execute(
      "REPLACE INTO livestream (id, embed_code, isLive) VALUES (1, ?, ?)",
      [embedCode, isLive]
    );

    console.log("🎥 Livestream embed code updated successfully!");
    res.json({ message: "Livestream embed updated successfully" }); // Respond with success
  } catch (error) {
    console.error("❌ Database Error on POST:", error); // Log any database errors
    res.status(500).json({ message: "Database error", error: error.message }); // Respond with a 500 error
  } finally {
    if (connection) connection.release(); // Release the database connection back to the pool
  }
});

// 🔹 Retrieve Livestream Embed Code
router.get("/", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection(); // Get a database connection from the pool
    console.log("✅ Connected to database for retrieval");

    // Query the database for the livestream embed code and isLive status
    const [rows] = await connection.execute(
      "SELECT embed_code, isLive FROM livestream WHERE id = 1"
    );

    if (rows.length > 0) {
      console.log("🎥 Livestream embed and isLive status retrieved:", rows[0]); // Log the retrieved data
    } else {
      console.warn("⚠️ No livestream embed found in database."); // Log a warning if no data is found
    }

    // Respond with the retrieved data or default values if no data is found
    res.json({
      embedCode: rows.length > 0 ? rows[0].embed_code : "",
      isLive: rows.length > 0 ? rows[0].isLive : false,
    });
  } catch (error) {
    console.error("❌ Database Error on GET:", error); // Log any database errors
    res.status(500).json({ message: "Database error", error: error.message }); // Respond with a 500 error
  } finally {
    if (connection) connection.release(); // Release the database connection back to the pool
  }
});

module.exports = router; // Export the router for use in other parts of the application
