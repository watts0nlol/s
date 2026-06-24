// server/middleware/logger.js
// Middleware for logging request details
const logger = (req, res, next) => {
    console.log(`url: ${req.url}`); // Log the requested URL
    console.log(`query: ${JSON.stringify(req.query)}`); // Log the query parameters as a JSON string
    console.log(`params: ${JSON.stringify(req.params)}`); // Log the route parameters as a JSON string
    console.log(`body: ${JSON.stringify(req.body)}`); // Log the request body as a JSON string
    next(); // Call the next middleware or route handler in the stack
};
// Export the logger middleware
export default logger;
