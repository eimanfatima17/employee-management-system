import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";

const { Pool, types } = pkg;

types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool
  .query("SELECT 1")
  .then(() => console.log("Database connected successfully"))
  .catch((err) => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });

export default pool;