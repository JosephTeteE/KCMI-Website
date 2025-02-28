// File: api/livestream.js
// Desc: API routes for updating and retrieving the livestream embed code

const express = require("express");
const pool = require("../server/db");
const router = express.Router();

// ✅ Middleware to log all incoming requests
router.use((req, res, next) => {
  console.log(`📡 [${req.method}] Request to ${req.originalUrl}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("🔍 Request Body:", req.body);
  }
  next();
});

// 🔹 Update Livestream Embed Code
router.post("/", async (req, res) => {
  const { embedCode } = req.body;

  if (!embedCode) {
    console.warn("⚠️ Missing embedCode in request");
    return res.status(400).json({ message: "Embed code is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    console.log("✅ Connected to database for update");

    await connection.execute(
      "REPLACE INTO livestream (id, embed_code) VALUES (1, ?)",
      [embedCode]
    );

    console.log("🎥 Livestream embed code updated successfully!");
    res.json({ message: "Livestream embed updated successfully" });
  } catch (error) {
    console.error("❌ Database Error on POST:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  } finally {
    if (connection) connection.release(); // Ensure connection is released
  }
});

// 🔹 Retrieve Livestream Embed Code
router.get("/", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("✅ Connected to database for retrieval");

    const [rows] = await connection.execute(
      "SELECT embed_code FROM livestream WHERE id = 1"
    );

    if (rows.length > 0) {
      console.log("🎥 Livestream embed retrieved:", rows[0].embed_code);
    } else {
      console.warn("⚠️ No livestream embed found in database.");
    }

    res.json({ embedCode: rows.length > 0 ? rows[0].embed_code : "" });
  } catch (error) {
    console.error("❌ Database Error on GET:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  } finally {
    if (connection) connection.release(); // Ensure connection is released
  }
});

module.exports = router;
