import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		prerender: {
			handleMissingId: 'warn'
		}
	}
};

export default config;