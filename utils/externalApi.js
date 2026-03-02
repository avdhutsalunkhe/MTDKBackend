// utils/externalApi.js

/**
 * External API Data Fetcher
 * Requirements satisfied:
 * - Timeout: 3-5 seconds (Defaults to 4000ms)
 * - Retry: Max 3 attempts
 * - Fallback mechanism required
 * - External failures must not crash the system.
 */
const fetchExternalData = async (url, options = {}, retries = 3, timeoutMs = 4000) => {
	const attemptFetch = async (currentAttempt) => {
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});
			clearTimeout(id);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.json();
		} catch (err) {
			clearTimeout(id);
			if (currentAttempt < retries) {
				console.warn(`[External API] Attempt ${currentAttempt} failed for ${url}. Retrying...`);
				return attemptFetch(currentAttempt + 1);
			}
			throw err;
		}
	};

	try {
		return await attemptFetch(1);
	} catch (err) {
		console.error(`[External API] Fetch failed after ${retries} retries:`, err.message);

		// Fallback mechanism to ensure external failures do NOT crash the system
		return {
			success: false,
			message: "External API unavailable, serving fallback data",
			fallback: true,
			data: null
		};
	}
};

module.exports = { fetchExternalData };
