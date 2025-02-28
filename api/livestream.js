// File: api/livestream.js
// Desc: Frontend logic for updating and retrieving the livestream embed code
// Desc: API routes for updating and retrieving the livestream embed code
// The code snippet below is from the admin.js file in the public/admin/js directory. It is responsible for handling the logic for updating and retrieving the livestream embed code. The code uses the Fetch API to make HTTP requests to the backend server, specifically to the /api/livestream route. The backend server is expected to handle these requests and interact with the database to update or retrieve the embed code.

const express = require("express");
const pool = require("../server/db");
const router = express.Router();

// Update Livestream Embed Code
router.post("/", async (req, res) => {
  const { embedCode } = req.body;

  if (!embedCode) {
    return res.status(400).json({ message: "Embed code is required" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.execute(
      "REPLACE INTO livestream (id, embed_code) VALUES (1, ?)",
      [embedCode]
    );
    res.json({ message: "Livestream embed updated successfully" });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  } finally {
    if (connection) connection.release(); // Ensure connection is released
  }
});

// Retrieve Livestream Embed Code
router.get("/", async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT embed_code FROM livestream WHERE id = 1"
    );
    res.json({ embedCode: rows.length > 0 ? rows[0].embed_code : "" });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  } finally {
    if (connection) connection.release(); // Ensure connection is released
  }
});

module.exports = router;
