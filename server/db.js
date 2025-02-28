// server/db.js
// Description: This file contains the code to connect to the MySQL database.
// The code uses the mysql2/promise library to connect to the database.
// The code reads the database connection details from the .env file.
// The code exports the connection pool which can be used to execute queries on the database.
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    ca: Buffer.from(process.env.DB_SSL_CERT_BASE64, "base64").toString("utf-8"),
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
