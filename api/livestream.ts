// api/livestream.ts
import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../server/db';
import { RowDataPacket, PoolConnection } from 'mysql2/promise';

const router = Router();
// Define the Livestream interface for type safety
interface Livestream extends RowDataPacket {
  id: number;
  isLive: boolean;
  embed_code: string;
}

// Middleware to log requests
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
    return res.status(400).json({ message: "Embed code is required" });
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await pool.getConnection();
  
    await connection.execute(
      "REPLACE INTO livestream (id, embed_code, isLive) VALUES (1, ?, ?)",
      [embedCode, isLive]
    );
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
  
    const [rows] = await connection.execute<Livestream[]>(
      "SELECT embed_code, isLive FROM livestream WHERE id = 1"
    );

    if (rows.length > 0) {
      const settings = rows[0];
      res.json({
        embedCode: settings.embed_code,
        isLive: !!settings.isLive, // Coerce to boolean for safety
      });
    } else {
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

export = router;