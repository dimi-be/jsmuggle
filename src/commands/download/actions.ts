import { resolve } from 'path';
import { checkDirectory } from '../../utils/fs.js';
import { ensureAuthenticated } from '../../auth/index.js';
import { extractGeocacheInfo } from '../../scraper/geocache.js';
import { downloadCaches } from '../../utils/download.js';
import { CommandContext } from '../../context.js';
import { logError } from '../../utils/error.js';

export interface DownloadOptions {
	output: string;
	force: boolean;
}

// GC code validation regex
const GC_CODE_REGEX = /^GC[A-Z0-9]+$/i;

export async function handleDownload(
	ctx: CommandContext,
	gcCodes: string[],
	options: DownloadOptions,
): Promise<void> {
	// Validate GC code format
	const invalidCodes = gcCodes.filter((code) => !GC_CODE_REGEX.test(code));
	if (invalidCodes.length > 0) {
		console.error(`Invalid GC code(s): ${invalidCodes.join(', ')}`);
		console.error('GC codes must match format: GCXXXXX (e.g., GC13Y2Y)');
		process.exit(1);
	}

	// Remove duplicates
	const gcCodeList = [...new Set(gcCodes)];

	if (gcCodeList.length === 0) {
		console.log('No valid GC codes provided.');
		process.exit(1);
	}

	// Resolve and validate output directory
	const resolvedDir = resolve(options.output);
	const dirCheck = await checkDirectory(resolvedDir);

	if (!dirCheck.exists) {
		console.error(`Directory does not exist: ${resolvedDir}`);
		process.exit(1);
	}

	if (!dirCheck.writable) {
		console.error(`Directory not writeable: ${resolvedDir}`);
		process.exit(1);
	}

	// Ensure authentication
	const { client } = ctx;
	const authenticated = await ensureAuthenticated(client, {
		verbose: ctx.options.verbose,
		trace: ctx.options.trace,
	});

	if (!authenticated) {
		console.error(
			'Authentication failed. Run `jsmuggle auth login` to authenticate.',
		);
		process.exit(1);
	}

	console.log('\nCache information:\n');

	const displayResults: {
		gcCode: string;
		name: string;
		premiumOnly: boolean;
		exists: boolean;
	}[] = [];

	for (let i = 0; i < gcCodeList.length; i++) {
		const gcCode = gcCodeList[i];

		try {
			// Extract cache info (name and premium status)
			const info = await extractGeocacheInfo(client, gcCode);

			if (!info.exists) {
				console.log(`${gcCode} - Cache not found`);
				displayResults.push({
					gcCode,
					name: '',
					premiumOnly: false,
					exists: false,
				});
				if (!options.force) {
					process.exit(1);
				}
				continue;
			}

			// Display cache info
			const premiumMark = info.premiumOnly ? ' [P]' : '';
			console.log(`${gcCode} ${info.name}${premiumMark}`);
			displayResults.push({
				gcCode,
				name: info.name,
				premiumOnly: info.premiumOnly,
				exists: true,
			});

			// Add delay between requests (except for the last one)
			const delay = ctx.options.delay || 1000;
			if (i < gcCodeList.length - 1 && delay > 0) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logError(`${gcCode} - Error: ${errorMessage}`, error, {
				verbose: ctx.options.verbose,
			});
			displayResults.push({
				gcCode,
				name: '',
				premiumOnly: false,
				exists: false,
			});
			if (!options.force) {
				process.exit(1);
			}
		}
	}

	console.log(
		`\nTotal: ${displayResults.filter((r) => r.exists).length} caches found\n`,
	);

	// Download GPX files
	await downloadCaches(client, gcCodeList, {
		directory: resolvedDir,
		delay: ctx.options.delay || 1000,
		force: options.force,
		verbose: ctx.options.verbose,
	});
}
