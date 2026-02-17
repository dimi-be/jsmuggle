import { ensureAuthenticated } from '../../auth/index.js';
import { searchNearby, formatSearchResults } from '../../scraper/search.js';
import { promptForSearchTerm, promptCacheSelection } from './prompts.js';
import { downloadCaches } from '../../utils/download.js';
import { CommandContext } from '../../context.js';
import { logError } from '../../utils/error.js';

export interface SearchOptions {
	searchTerm: string | undefined;
	includePremium: boolean;
	download: boolean;
	output: string;
	force: boolean;
	radius: number;
	limit: number;
}

export async function handleSearch(
	ctx: CommandContext,
	options: SearchOptions,
): Promise<void> {
	const { client } = ctx;

	// Prompt for search term if not provided
	let searchTerm = options.searchTerm;
	if (!searchTerm) {
		const promptResult = await promptForSearchTerm();
		if (typeof promptResult === 'symbol') {
			// User cancelled the prompt (e.g., pressed Escape)
			return;
		}
		searchTerm = promptResult;
	}

	const isAuthenticated = await ensureAuthenticated(client, {
		verbose: ctx.options.verbose,
		trace: ctx.options.trace,
	});

	if (!isAuthenticated) {
		console.error(
			'Authentication failed. Run `jsmuggle auth login` to authenticate.',
		);
		process.exit(1);
	}

	// Interactive mode is when --download is NOT provided
	const interactive = !options.download;

	// Fetch results with pagination support (limit and interactive mode handled internally)
	const delay = ctx.options.delay || 1000;
	const { results, displayTerm } = await searchNearby(
		client,
		searchTerm,
		options.radius,
		options.limit,
		interactive,
		options.includePremium,
		delay,
	);

	// Download GPX files
	if (options.download) {
		// Non-interactive mode: show results list and auto-download all
		const outputLines = formatSearchResults(results, true);

		console.log(`\nSearch results for ${displayTerm}:\n`);
		if (outputLines.length === 0) {
			console.log('No caches found in search results.\n');
			return;
		} else {
			outputLines.forEach((line) => console.log(line));
			console.log(`\nTotal: ${outputLines.length} caches found\n`);
		}

		const gcCodeList = results.map((r) => r.code);
		await downloadCaches(client, gcCodeList, {
			directory: options.output,
			delay: delay,
			force: options.force,
			verbose: ctx.options.verbose,
		});
	} else {
		// Interactive mode: check if results exist, then show selection prompt
		if (results.length === 0) {
			console.log(`\nSearch results for ${displayTerm}:\n`);
			console.log('No caches found in search results.\n');
			return;
		}

		// Interactive mode: let user select which caches to download
		const selectedCodes = await promptCacheSelection(results);

		if (selectedCodes.length > 0) {
			await downloadCaches(client, selectedCodes, {
				directory: options.output,
				delay: delay,
				force: options.force,
				verbose: ctx.options.verbose,
			});
		} else {
			console.log('No caches selected for download.\n');
		}
	}
}
