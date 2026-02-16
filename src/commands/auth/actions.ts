import { CommandContext } from '../../context.js';
import { ensureAuthenticated } from '../../auth/index.js';
import { promptCredentials } from './prompts.js';
import { getSessionFilePath } from '../../config/storage.js';
import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { logError } from '../../utils/error.js';

export async function handleAuthStatus(ctx: CommandContext): Promise<void> {
	const { client } = ctx;

	// Check if session file exists
	const sessionPath = getSessionFilePath();
	const hasSessionFile = existsSync(sessionPath);

	if (!hasSessionFile) {
		console.log(
			'No session found. Run `jsmuggle auth login` to authenticate.',
		);
		return;
	}

	// Try to validate the session by checking authentication
	const authenticated = await ensureAuthenticated(client, {});

	if (authenticated) {
		console.log('Session is active and valid.');
	} else {
		console.log(
			'Session is invalid or expired. Run `jsmuggle auth login` to authenticate.',
		);
	}
}

export async function handleAuthLogin(
	ctx: CommandContext,
	usernameArg?: string,
	passwordArg?: string,
): Promise<void> {
	const { client } = ctx;

	let username = usernameArg;
	let password = passwordArg;

	// Prompt for credentials if not provided
	if (!username || !password) {
		const credentials = await promptCredentials();
		username = credentials.username;
		password = credentials.password;
	}

	const authenticated = await ensureAuthenticated(client, {
		username,
		password,
		verbose: ctx.options.verbose,
		trace: ctx.options.trace,
	});

	if (!authenticated) {
		console.error('Login failed.');
		process.exit(1);
	}

	console.log('Login successful!');
}

export async function handleAuthLogout(): Promise<void> {
	const sessionPath = getSessionFilePath();

	try {
		await writeFile(
			sessionPath,
			JSON.stringify({ cookies: '', timestamp: 0 }, null, 2),
		);
		console.log('Session cleared successfully.');
	} catch (error) {
		logError('Failed to clear session', error, { verbose: true });
		process.exit(1);
	}
}
