// api/livestream.ts
import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../server/db'; // Correctly import the named export
import { RowDataPacket, PoolConnection } from 'mysql2/promise';

const router = Router();

// Define a type for the data we expect from the database
interface LivestreamSettings extends RowDataPacket {
  id: number;
  is_live: boolean;
  embed_code: string;
  last_updated: string;
}

// Middleware to log all incoming requests to this router
router.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`📡 [${req.method}] Request to /api/livestream${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("🔍 Request Body:", req.body);
  }
  next();
});

// Update Livestream Embed Code
router.post("/", async (req: Request, res: Response) => {
  const { embedCode, isLive } = req.body as { embedCode: string; isLive: boolean };

  if (typeof embedCode === 'undefined') {
    console.warn("⚠️ Missing embedCode in request");
    return res.status(400).json({ message: "Embed code is required" });
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await pool.getConnection();
    console.log("✅ [Livestream] Connected to database for update");

    await connection.execute(
      "REPLACE INTO livestream_settings (id, embed_code, isLive) VALUES (1, ?, ?)",
      [embedCode, isLive]
    );

    console.log("🎥 Livestream embed code updated successfully!");
    res.json({ message: "Livestream embed updated successfully" });
  } catch (error: any) {
    console.error("❌ [Livestream] Database Error on POST:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Retrieve Livestream Embed Code
router.get("/", async (_req: Request, res: Response) => {
  let connection: PoolConnection | undefined;
  try {
    connection = await pool.getConnection();
    console.log("✅ [Livestream] Connected to database for retrieval");

    const [rows] = await connection.execute<LivestreamSettings[]>(
      "SELECT embed_code, isLive FROM livestream_settings WHERE id = 1"
    );

    if (rows.length > 0) {
        const settings = rows[0];
        res.json({
            embedCode: settings.embed_code,
            isLive: !!settings.is_live, // Coerce to boolean
        });
    } else {
        console.warn("⚠️ No livestream settings found in database.");
        res.status(404).json({
            embedCode: "",
            isLive: false,
            message: "No livestream settings found",
        });
    }
  } catch (error: any) {
    console.error("❌ [Livestream] Database Error on GET:", error);
    res.status(500).json({ message: "Database error", error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// Use `export =` for perfect CommonJS compatibility with server.ts
export = router;