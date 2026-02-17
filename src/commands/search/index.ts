import { Command } from 'commander';
import { GlobalOptions, withContext } from '../../context.js';
import { handleSearch, SearchOptions } from './actions.js';

// Re-export for backwards compatibility
export { handleSearch } from './actions.js';
export type { SearchOptions } from './actions.js';

interface SearchCommandOptions {
	premium: boolean;
	download?: boolean;
	output: string;
	force?: boolean;
	radius: string;
	limit: string;
}

export function registerSearchCommand(program: Command): void {
	program
		.command('search')
		.alias('s')
		.description('Query geocaches via GC code, coordinates, or keywords')
		.argument(
			'[searchTerm]',
			'Search term (GC code, coordinates, or keyword)',
		)
		.option('--no-premium', 'Filter out Premium Member Only caches')
		.option(
			'--download',
			'Download all results immediately after searching (non-interactive mode)',
		)
		.option(
			'-o, --output <directory>',
			'Output directory for GPX files (default: `.`)',
			'.',
		)
		.option(
			'-f, --force',
			'Skip overwrite prompts and ignore individual download errors',
		)
		.option('-r, --radius <number>', 'Search radius (default: `10`)', '10')
		.option(
			'-l, --limit <number>',
			'Maximum number of results to show (default: `20`)',
			'20',
		)
		.action(
			async (
				searchTerm: string | undefined,
				options: SearchCommandOptions,
			) => {
				const globalOptions = program.opts<GlobalOptions>();
				await withContext(globalOptions, async (ctx) => {
					await handleSearch(ctx, {
						searchTerm,
						includePremium: options.premium,
						download: options.download || false,
						output: options.output,
						force: options.force || false,
						radius: parseInt(options.radius, 10),
						limit: parseInt(options.limit, 10),
					});
				});
			},
		);
}
