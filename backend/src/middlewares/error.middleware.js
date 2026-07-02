export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl} →`, err.message);

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate value: record already exists.' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Invalid reference: related record does not exist.' });
  }

  if (err.code === '23502') {
    return res.status(400).json({ success: false, message: `Missing required field: ${err.column}` });
  }

  if (err.code === '23514') {
    return res.status(400).json({ success: false, message: 'Data failed a database validation check.' });
  }

  if (err.code === '22P02') {
    return res.status(400).json({ success: false, message: 'Invalid value for an enumerated field.' });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token has expired' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
