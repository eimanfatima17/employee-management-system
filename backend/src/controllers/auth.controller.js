import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateEmail } from '../utils/validators.js';

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);

    const user = result.rows[0];

    const dummyHash = '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const isMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    pool
      .query('DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()', [user.id])
      .catch(() => {});

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }

    const storedResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (!storedResult.rows.length) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    } catch {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const result = await pool.query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(403).json({ success: false, message: 'Account not found or deactivated' });
    }

    const newToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ success: true, message: 'Token refreshed', token: newToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  const { token } = req.body;

  try {
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};
