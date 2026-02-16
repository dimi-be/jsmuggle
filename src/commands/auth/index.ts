import { Command } from 'commander';
import { GlobalOptions, withContext } from '../../context.js';
import {
	handleAuthStatus,
	handleAuthLogin,
	handleAuthLogout,
} from './actions.js';

// Re-export actions for backwards compatibility
export {
	handleAuthStatus,
	handleAuthLogin,
	handleAuthLogout,
} from './actions.js';

// Re-export from auth module
export { ensureAuthenticated } from '../../auth/index.js';
export type { AuthOptions } from '../../auth/index.js';

interface AuthCommandOptions {
	username?: string;
	password?: string;
}

export function registerAuthCommand(program: Command): void {
	const authCmd = program
		.command('auth')
		.description('Manage user sessions')
		.option('-u, --username <username>', 'Username for authentication')
		.option('-p, --password <password>', 'Password for authentication');

	authCmd
		.command('login')
		.description('Force a new login flow')
		.action(async () => {
			const options = authCmd.opts<AuthCommandOptions>();
			const globalOptions = program.opts<GlobalOptions>();
			await withContext(globalOptions, async (ctx) => {
				await handleAuthLogin(ctx, options.username, options.password);
			});
		});

	authCmd
		.command('logout')
		.description('Clear the session file')
		.action(async () => {
			await handleAuthLogout();
		});

	// Default action for auth command (status check)
	authCmd.action(async () => {
		const globalOptions = program.opts<GlobalOptions>();
		await withContext(globalOptions, async (ctx) => {
			await handleAuthStatus(ctx);
		});
	});
}
