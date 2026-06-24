// server/middleware/errorHandler.js
// Middleware for handling 404 and general errors
export const notFound = (req, res) => {
  res.status(404).json({ error: 'Resource not found' });
};
// General error handler
export const errorHandler = (err, req, res, _next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(statusCode).json({ error: message });
};
