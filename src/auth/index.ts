import type { AxiosInstance } from 'axios';
import { createClient, saveSession } from '../scraper/client.js';
import { validateSession } from './session.js';
import { extractLoginFormData, performLogin } from './login.js';
import { promptCredentials } from '../commands/auth/prompts.js';
import { logError } from '../utils/error.js';

export interface AuthOptions {
	username?: string;
	password?: string;
	verbose?: boolean;
	trace?: string | true;
}

export async function ensureAuthenticated(
	client: AxiosInstance,
	options: AuthOptions,
): Promise<boolean> {
	// Check existing session
	const sessionCheck = await validateSession(client);

	if (sessionCheck.valid && sessionCheck.username) {
		console.log(`Logged in as ${sessionCheck.username}.`);
		return true;
	}

	// Need to login
	let username = options.username;
	let password = options.password;

	// If credentials not provided as arguments, prompt for them
	if (!username || !password) {
		console.log('No active session found.');
		const credentials = await promptCredentials();
		username = credentials.username;
		password = credentials.password;
	}

	if (!username || !password) {
		console.log('Login failed: Missing credentials');
		return false;
	}

	// Perform login
	console.log('Attempting to login...');

	try {
		const formData = await extractLoginFormData(client);
		const loginSuccess = await performLogin(
			client,
			username,
			password,
			formData,
		);

		if (!loginSuccess) {
			console.log('Login failed!');
			return false;
		}

		// Save session
		await saveSession(client);
		console.log('Login successful!');

		// Verify session and get username
		const newSessionCheck = await validateSession(client);
		if (newSessionCheck.valid && newSessionCheck.username) {
			console.log(`Logged in as ${newSessionCheck.username}.`);
			return true;
		} else {
			console.log('Session not active!');
			return false;
		}
	} catch (error) {
		logError('Login failed!', error, { verbose: options.verbose });
		return false;
	}
}

// Re-export other auth functions
export { validateSession } from './session.js';
export { extractLoginFormData, performLogin } from './login.js';
