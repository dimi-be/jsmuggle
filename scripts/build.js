#!/usr/bin/env node

import { build } from 'esbuild';
import { readFileSync, writeFileSync, chmodSync } from 'fs';

// Read package.json to get the current version
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

console.log(`Building jsmuggle v${version}...`);

try {
	await build({
		entryPoints: ['src/index.ts'],
		outfile: 'dist/jsmuggle.cjs',
		bundle: true,
		platform: 'node',
		target: 'node20',
		format: 'cjs',
		minify: true,
		sourcemap: true,

		define: {
			'process.env.npm_package_version': `"${version}"`,
		},
		loader: {
			'.ts': 'ts',
		},
		tsconfig: './tsconfig.json',
	});

	// Add shebang to the output file
	const outputPath = 'dist/jsmuggle.cjs';
	const content = readFileSync(outputPath, 'utf8');
	if (!content.startsWith('#!/usr/bin/env node')) {
		writeFileSync(outputPath, `#!/usr/bin/env node\n${content}`);
	}

	// Make executable
	chmodSync(outputPath, 0o755);

	console.log('✓ Build completed successfully');
	console.log('  Output: dist/jsmuggle.cjs');
	console.log('  Sourcemap: dist/jsmuggle.cjs.map');
} catch (error) {
	console.error('✗ Build failed:', error);
	process.exit(1);
}
