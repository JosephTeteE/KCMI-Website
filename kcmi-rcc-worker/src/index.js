/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

addEventListener('fetch', (event) => {
	event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
	const url = new URL(request.url);

	// Cache static assets
	if (
		url.pathname.startsWith('/assets/') ||
		url.pathname.startsWith('/css/') ||
		url.pathname.startsWith('/js/') ||
		url.pathname.startsWith('/admin/js/') ||
		url.pathname.endsWith('.css') ||
		url.pathname.endsWith('.js')
	) {
		const cache = caches.default;
		let response = await cache.match(request);

		if (!response) {
			response = await fetch(request);
			response = new Response(response.body, response);
			response.headers.append('Cache-Control', 'public, max-age=31536000');
			event.waitUntil(cache.put(request, response.clone()));
		}

		return response;
	}

	// Pass through all other requests
	return fetch(request);
}
