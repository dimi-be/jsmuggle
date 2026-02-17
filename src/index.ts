#!/usr/bin/env node

/*
 * jsmuggle - Generate GPX files from geocaching.com from the command line.
 * Copyright (C) 2026  Dimitri Michaux
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Command } from 'commander';
import { registerAuthCommand } from './commands/auth/index.js';
import { registerDownloadCommand } from './commands/download/index.js';
import { registerSearchCommand } from './commands/search/index.js';
import { GlobalOptions, withContext } from './context.js';
import { handleAuthStatus } from './commands/auth/actions.js';

const program = new Command();

program
	.name('jsmuggle')
	.description('Generate GPX files from geocaching.com from the command line')
	.version('1.1.0')
	.configureOutput({ writeErr: (str) => process.stdout.write(str) })
	.option('--verbose', 'Show extra details about HTTP requests being made')
	.option(
		'--trace [path]',
		'Trace mode logs all requests to ./jsmuggle.har or the specified path',
	)
	.option(
		'-d, --delay <ms>',
		'Delay between requests in milliseconds (default: 1000)',
		'1000',
	)
	.helpOption('-h, --help', 'Print this message');

// Register commands
registerAuthCommand(program);
registerDownloadCommand(program);
registerSearchCommand(program);

// Default action when no command is provided
program.action(async () => {
	const globalOptions = program.opts<GlobalOptions>();
	await withContext(globalOptions, async (ctx) => {
		await handleAuthStatus(ctx);
	});
});

program.parse();
