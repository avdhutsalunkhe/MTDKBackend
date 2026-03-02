// middleware/internalApi.js

// 1. Response time monitoring
const responseTimeMonitor = (req, res, next) => {
	const start = process.hrtime();
	res.on('finish', () => {
		const diff = process.hrtime(start);
		const time = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
		console.log(`[Response Time] ${req.method} ${req.url} - ${time} ms`);
	});
	next();
};

// 2. Authentication middleware validation
const authenticate = (req, res, next) => {
	// This expects an Authorization header for protected internal APIs
	const token = req.headers['authorization'];
	if (!token) {
		return res.status(401).json({ error: 'Unauthorized: No token provided' });
	}
	// Expected basic token validation implementation
	if (token !== 'Bearer secure-token-for-mtdk-admin') {
		return res.status(403).json({ error: 'Forbidden: Invalid token' });
	}
	next();
};

// 3. 5xx Error tracking 
const errorHandler = (err, req, res, next) => {
	console.error('[5xx Error Tracking - Critical Failure]', err.stack);
	res.status(500).json({
		error: 'Internal Server Error',
		message: 'A critical error occurred while processing your request.'
	});
};

// 4. Route accessibility check
const routeCheck = (req, res, next) => {
	// Ensures routes are fundamentally accessible without crashing on preflights
	if (req.method === 'OPTIONS') {
		return res.sendStatus(200);
	}
	next();
};

module.exports = {
	responseTimeMonitor,
	authenticate,
	errorHandler,
	routeCheck
};
