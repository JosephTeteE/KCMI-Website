/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/**
 * This is a Cloudflare Worker script that handles HTTP requests.
 * It caches static assets and passes through all other requests.
 *
 * The script uses the Fetch API to handle requests and responses.
 * It caches static assets for 1 year (31536000 seconds) using Cache-Control headers.
 *
 * The script is designed to be deployed on Cloudflare Workers.
 */

/* File: kcmi-rcc-worker/src/index.js */

// Add an event listener for the 'fetch' event, which is triggered for every HTTP request
addEventListener('fetch', (event) => {
	// Respond to the request by calling the handleRequest function
	event.respondWith(handleRequest(event.request));
});

/**
 * Handles incoming HTTP requests.
 * @param {Request} request - The incoming HTTP request object.
 * @returns {Promise<Response>} - The HTTP response to be sent back to the client.
 */
async function handleRequest(request) {
	// Parse the URL of the incoming request
	const url = new URL(request.url);

	// Check if the request is for static assets (e.g., CSS, JS, or files in specific directories)
	if (
		url.pathname.startsWith('/assets/') || // Static assets directory
		url.pathname.startsWith('/css/') || // CSS files directory
		url.pathname.startsWith('/js/') || // JavaScript files directory
		url.pathname.startsWith('/admin/js/') || // Admin JavaScript files directory
		url.pathname.endsWith('.css') || // Files ending with .css
		url.pathname.endsWith('.js') // Files ending with .js
	) {
		// Access the default cache provided by Cloudflare Workers
		const cache = caches.default;

		// Try to find a cached response for the request
		let response = await cache.match(request);

		// If no cached response exists, fetch the resource from the origin server
		if (!response) {
			response = await fetch(request);

			// Clone the response and add Cache-Control headers to cache it for 1 year
			response = new Response(response.body, response);
			response.headers.append('Cache-Control', 'public, max-age=31536000');

			// Store the response in the cache asynchronously
			event.waitUntil(cache.put(request, response.clone()));
		}

		// Return the cached or newly fetched response
		return response;
	}

	// For all other requests, pass them through to the origin server
	return fetch(request);
}
