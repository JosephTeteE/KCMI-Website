// server/db.js

const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
// The database connection is now handled by the db.js file, which exports a pool object that can be used to execute queries. The server.js file imports the pool object and uses it to execute queries. This separation of concerns makes the code easier to read and maintain.
