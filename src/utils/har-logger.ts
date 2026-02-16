import { writeFileSync, existsSync, readFileSync } from 'fs';
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Safe JSON stringify that handles circular references
function safeStringify(obj: unknown): string {
	const seen = new WeakSet();
	return JSON.stringify(obj, (key, value) => {
		if (typeof value === 'object' && value !== null) {
			if (seen.has(value)) {
				return '[Circular]';
			}
			seen.add(value);
		}
		return value;
	});
}

interface HarHeader {
	name: string;
	value: string;
}

interface HarCookie {
	name: string;
	value: string;
}

interface HarRequest {
	method: string;
	url: string;
	httpVersion: string;
	headers: HarHeader[];
	queryString: HarHeader[];
	cookies: HarCookie[];
	headersSize: number;
	bodySize: number;
	postData?: {
		mimeType: string;
		text: string;
	};
}

interface HarResponse {
	status: number;
	statusText: string;
	httpVersion: string;
	headers: HarHeader[];
	cookies: HarCookie[];
	content: {
		size: number;
		mimeType: string;
		text?: string;
	};
	redirectURL: string;
	headersSize: number;
	bodySize: number;
}

interface HarEntry {
	startedDateTime: string;
	time: number;
	request: HarRequest;
	response: HarResponse;
	cache: Record<string, unknown>;
	timings: {
		send: number;
		wait: number;
		receive: number;
	};
}

interface HarLog {
	version: string;
	creator: {
		name: string;
		version: string;
	};
	pages: unknown[];
	entries: HarEntry[];
}

interface HarData {
	log: HarLog;
}

interface PendingRequest {
	startTime: number;
	config: AxiosRequestConfig;
}

export class HarLogger {
	private entries: HarEntry[] = [];
	private pendingRequests = new Map<string, PendingRequest>();
	private filePath?: string;

	constructor(filePath?: string) {
		if (filePath) {
			this.filePath = filePath;
			this.loadFromFile(filePath);
		}
	}

	private generateEntryId(config: AxiosRequestConfig): string {
		return `${config.method?.toUpperCase() || 'GET'}-${config.url}-${Date.now()}`;
	}

	private loadFromFile(filePath: string): void {
		if (!existsSync(filePath)) {
			return;
		}

		try {
			const data = readFileSync(filePath, 'utf-8');
			const harData = JSON.parse(data) as HarData;
			if (harData.log && Array.isArray(harData.log.entries)) {
				this.entries = harData.log.entries;
			}
		} catch {
			// If file is corrupted or invalid, start fresh
			this.entries = [];
		}
	}

	private saveToFileIncremental(): void {
		if (!this.filePath) return;

		try {
			const harData = this.generateHar();
			writeFileSync(this.filePath, JSON.stringify(harData, null, 2));
		} catch (error) {
			console.warn(`Warning: Failed to write HAR file: ${error}`);
		}
	}

	startRequest(config: AxiosRequestConfig): string {
		const entryId = this.generateEntryId(config);
		this.pendingRequests.set(entryId, {
			startTime: Date.now(),
			config,
		});
		return entryId;
	}

	completeRequest(entryId: string, response: AxiosResponse): void {
		const pending = this.pendingRequests.get(entryId);
		if (!pending) return;

		const endTime = Date.now();
		const duration = endTime - pending.startTime;

		const entry = this.createHarEntry(
			pending.config,
			response,
			pending.startTime,
			duration,
		);
		this.entries.push(entry);
		this.pendingRequests.delete(entryId);

		// Save incrementally to file
		this.saveToFileIncremental();
	}

	logError(entryId: string, error: AxiosError): void {
		const pending = this.pendingRequests.get(entryId);
		if (!pending) return;

		const endTime = Date.now();
		const duration = endTime - pending.startTime;

		const response = error.response;
		if (response) {
			const entry = this.createHarEntry(
				pending.config,
				response,
				pending.startTime,
				duration,
			);
			this.entries.push(entry);
			// Save incrementally to file
			this.saveToFileIncremental();
		}

		this.pendingRequests.delete(entryId);
	}

	private createHarEntry(
		config: AxiosRequestConfig,
		response: AxiosResponse,
		startTime: number,
		duration: number,
	): HarEntry {
		const startedDateTime = new Date(startTime).toISOString();

		// Build request headers
		const requestHeaders: HarHeader[] = [];
		if (config.headers) {
			Object.entries(config.headers).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					requestHeaders.push({
						name: key,
						value: String(value),
					});
				}
			});
		}

		// Build response headers
		const responseHeaders: HarHeader[] = [];
		if (response.headers) {
			Object.entries(response.headers).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					responseHeaders.push({
						name: key,
						value: String(value),
					});
				}
			});
		}

		// Get request body
		let requestBody = '';
		if (config.data) {
			if (typeof config.data === 'string') {
				requestBody = config.data;
			} else if (Buffer.isBuffer(config.data)) {
				requestBody = config.data.toString();
			} else {
				requestBody = safeStringify(config.data);
			}
		}

		// Get response body
		let responseBody = '';
		if (response.data) {
			if (typeof response.data === 'string') {
				responseBody = response.data;
			} else if (Buffer.isBuffer(response.data)) {
				responseBody = response.data.toString();
			} else {
				responseBody = safeStringify(response.data);
			}
		}

		// Get cookies from response headers
		const responseCookies: HarCookie[] = [];
		const setCookieHeader = response.headers['set-cookie'];
		if (setCookieHeader) {
			const cookieStrings = Array.isArray(setCookieHeader)
				? setCookieHeader
				: [setCookieHeader];
			cookieStrings.forEach((cookieStr) => {
				const parts = cookieStr.split(';')[0].split('=');
				if (parts.length >= 2) {
					responseCookies.push({
						name: parts[0].trim(),
						value: parts.slice(1).join('=').trim(),
					});
				}
			});
		}

		const request: HarRequest = {
			method: config.method?.toUpperCase() || 'GET',
			url: config.url || '',
			httpVersion: 'HTTP/1.1',
			headers: requestHeaders,
			queryString: [],
			cookies: [],
			headersSize: -1,
			bodySize: requestBody.length,
		};

		if (requestBody) {
			request.postData = {
				mimeType:
					config.headers?.['Content-Type']?.toString() ||
					'application/octet-stream',
				text: requestBody,
			};
		}

		const harResponse: HarResponse = {
			status: response.status,
			statusText: response.statusText || '',
			httpVersion: 'HTTP/1.1',
			headers: responseHeaders,
			cookies: responseCookies,
			content: {
				size: responseBody.length,
				mimeType:
					response.headers?.['content-type']?.toString() ||
					'application/octet-stream',
				text: responseBody,
			},
			redirectURL: response.headers?.['location']?.toString() || '',
			headersSize: -1,
			bodySize: responseBody.length,
		};

		return {
			startedDateTime,
			time: duration,
			request,
			response: harResponse,
			cache: {},
			timings: {
				send: 0,
				wait: duration,
				receive: 0,
			},
		};
	}

	generateHar(): HarData {
		return {
			log: {
				version: '1.2',
				creator: {
					name: 'jsmuggle',
					version: '1.0.0',
				},
				pages: [],
				entries: this.entries,
			},
		};
	}

	saveToFile(filePath: string): void {
		try {
			const harData = this.generateHar();
			writeFileSync(filePath, JSON.stringify(harData, null, 2));
		} catch (error) {
			console.warn(`Warning: Failed to write HAR file: ${error}`);
		}
	}

	hasEntries(): boolean {
		return this.entries.length > 0;
	}
}

export function createHarLogger(filePath?: string): HarLogger {
	return new HarLogger(filePath);
}
