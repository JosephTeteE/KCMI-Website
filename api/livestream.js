// api/livestream.js

const express = require("express");
const pool = require("../server/db");
const router = express.Router();

// Update Livestream Embed Code
router.post("/", async (req, res) => {
  const { embedCode } = req.body;

  if (!embedCode) {
    return res.status(400).json({ message: "Embed code is required" });
  }

  try {
    await pool.execute(
      "REPLACE INTO livestream (id, embed_code) VALUES (1, ?)",
      [embedCode]
    );
    res.json({ message: "Livestream embed updated successfully" });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
});

// Retrieve Livestream Embed Code
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT embed_code FROM livestream WHERE id = 1"
    );
    res.json({ embedCode: rows.length > 0 ? rows[0].embed_code : "" });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  }
});

module.exports = router;
