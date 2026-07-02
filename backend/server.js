import dotenv from 'dotenv';
dotenv.config();

const REQUIRED_ENV = ['JWT_SECRET', 'REFRESH_SECRET', 'DB_USER', 'DB_NAME'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[Startup] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

import app from './src/app.js';

const PORT = parseInt(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});