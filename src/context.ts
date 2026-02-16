import axios, { type AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { readFile } from 'fs/promises';
import { getSessionFilePath } from './config/storage.js';
import { createHarLogger, HarLogger } from './utils/har-logger.js';
import { DEFAULT_HAR_FILE_PATH } from './types/index.js';

const USER_AGENT =
	'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0';

// Extend AxiosRequestConfig to include jar property
declare module 'axios' {
	interface AxiosRequestConfig {
		jar?: CookieJar;
	}
}

export interface GlobalOptions {
	verbose?: boolean;
	trace?: string | true;
	delay?: number;
}

export interface CommandContext {
	client: AxiosInstance;
	options: GlobalOptions;
}

export async function initializeContext(
	options: GlobalOptions,
): Promise<CommandContext> {
	const client = await createClient(options.verbose, options.trace);
	return { client, options };
}

export async function createClient(
	verbose = false,
	trace?: string | true,
): Promise<AxiosInstance> {
	const jar = new CookieJar();
	const harFilePath = trace === true ? DEFAULT_HAR_FILE_PATH : trace;

	// Try to load existing session
	try {
		const sessionData = await readFile(getSessionFilePath(), 'utf-8');
		const { cookies } = JSON.parse(sessionData);
		if (cookies) {
			// Handle both old format (single string) and new format (array of strings)
			if (Array.isArray(cookies)) {
				// New format: array of Set-Cookie strings
				for (const cookieStr of cookies) {
					await jar.setCookie(
						cookieStr,
						'https://www.geocaching.com',
					);
				}
			} else {
				// Old format: single cookie string (for backwards compatibility)
				await jar.setCookie(cookies, 'https://www.geocaching.com');
			}
		}
	} catch {
		// No existing session or error reading file, continue with empty jar
	}

	const client = wrapper(
		axios.create({
			headers: {
				'User-Agent': USER_AGENT,
			},
			maxRedirects: 0, // Don't follow redirects automatically, we need to check status codes
			validateStatus: (status) => status < 400 || status === 302, // Allow 302 redirects
		}) as Parameters<typeof wrapper>[0],
	) as AxiosInstance;

	// Explicitly set the jar on the client defaults so axios-cookiejar-support can use it
	(client.defaults as unknown as { jar: CookieJar }).jar = jar;

	// Add verbose logging interceptors if verbose mode is enabled
	if (verbose) {
		client.interceptors.response.use(
			(response) => {
				const method =
					response.config?.method?.toUpperCase() || 'UNKNOWN';
				const url = response.config?.url || 'UNKNOWN';
				console.log(`${response.status} ${method} ${url}`);
				return response;
			},
			(error) => {
				if (error.response) {
					const method =
						error.config?.method?.toUpperCase() || 'UNKNOWN';
					const url = error.config?.url || 'UNKNOWN';
					console.log(`${error.response.status} ${method} ${url}`);
				}
				return Promise.reject(error);
			},
		);
	}

	// Add trace logging interceptors if trace mode is enabled
	if (harFilePath) {
		const harLogger = createHarLogger(harFilePath);
		(client as unknown as { harLogger?: HarLogger }).harLogger = harLogger;
		(client as unknown as { harFilePath?: string }).harFilePath =
			harFilePath;

		client.interceptors.request.use(
			(config) => {
				const entryId = harLogger.startRequest(config);
				(config as unknown as { harEntryId?: string }).harEntryId =
					entryId;
				return config;
			},
			(error) => {
				return Promise.reject(error);
			},
		);

		client.interceptors.response.use(
			(response) => {
				const entryId = (
					response.config as unknown as { harEntryId?: string }
				).harEntryId;
				if (entryId) {
					harLogger.completeRequest(entryId, response);
				}
				return response;
			},
			(error) => {
				const entryId = (
					error.config as unknown as { harEntryId?: string }
				).harEntryId;
				if (entryId && error.response) {
					harLogger.logError(entryId, error);
				}
				return Promise.reject(error);
			},
		);
	}

	return client;
}

export function saveHarFile(client: AxiosInstance): void {
	const harLogger = (client as unknown as { harLogger?: HarLogger })
		.harLogger;
	const harFilePath = (client as unknown as { harFilePath?: string })
		.harFilePath;
	if (harLogger && harLogger.hasEntries() && harFilePath) {
		try {
			harLogger.saveToFile(harFilePath);
		} catch (error) {
			throw new Error(`Failed to write HAR file: ${error}`);
		}
	}
}

export async function withContext<T>(
	options: GlobalOptions,
	action: (ctx: CommandContext) => Promise<T>,
): Promise<T> {
	const ctx = await initializeContext(options);
	try {
		return await action(ctx);
	} finally {
		if (options.trace) {
			saveHarFile(ctx.client);
		}
	}
}
