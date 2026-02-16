import { Command } from 'commander';
import { GlobalOptions, withContext } from '../../context.js';
import { handleDownload, DownloadOptions } from './actions.js';

// Re-export for backwards compatibility
export { handleDownload, DownloadOptions } from './actions.js';

interface DownloadCommandOptions {
	output: string;
	force?: boolean;
}

export function registerDownloadCommand(program: Command): void {
	program
		.command('download')
		.alias('d')
		.description('Fetch GPX files for specific caches')
		.argument('<codes...>', 'One or more GC codes (e.g., GC13Y2Y GC12345)')
		.option(
			'-o, --output <directory>',
			'Output directory for GPX files',
			'.',
		)
		.option(
			'-f, --force',
			'Skip overwrite prompts and ignore individual download errors',
		)
		.action(async (codes: string[], options: DownloadCommandOptions) => {
			const globalOptions = program.opts<GlobalOptions>();
			await withContext(globalOptions, async (ctx) => {
				await handleDownload(ctx, codes, {
					output: options.output,
					force: options.force || false,
				});
			});
		});
}
