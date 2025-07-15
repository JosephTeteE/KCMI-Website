// server/db.ts
import mysql, { type Pool, type PoolOptions } from "mysql2/promise";
import 'dotenv/config';

// Define the configuration with strong types from mysql2/promise
const dbConfig: PoolOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT), // Ensure port is a number
  ssl: {
    // Ensure the cert is only processed if the variable exists
    ca: process.env.DB_SSL_CERT_BASE64
      ? Buffer.from(process.env.DB_SSL_CERT_BASE64, "base64").toString()
      : undefined,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create the pool with the typed configuration
const pool: Pool = mysql.createPool(dbConfig);

// Export the pool for use in other modules
export { pool };