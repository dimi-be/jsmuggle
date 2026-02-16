import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		exclude: ['node_modules', 'dist'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'dist/', 'src/**/*.d.ts'],
		},
	},
});
