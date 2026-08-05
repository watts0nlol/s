// server/middleware/logger.js
const redactSensitiveValues = (value) => {
    if (Array.isArray(value)) return value.map(redactSensitiveValues);
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
            key,
            key.toLowerCase().includes('password') ? '[REDACTED]' : redactSensitiveValues(entry),
        ])
    );
};

// Middleware for logging request details
const logger = (req, res, next) => {
    const requestPath = req.path || req.originalUrl?.split('?')[0] || req.url?.split('?')[0];
    console.log(`url: ${requestPath}`); // Log the requested path without a raw query string
    console.log(`query: ${JSON.stringify(redactSensitiveValues(req.query))}`); // Log redacted query parameters
    console.log(`params: ${JSON.stringify(redactSensitiveValues(req.params))}`); // Log redacted route parameters
    console.log(`body: ${JSON.stringify(redactSensitiveValues(req.body))}`); // Log a redacted request body
    next(); // Call the next middleware or route handler in the stack
};
// Export the logger middleware
export default logger;
