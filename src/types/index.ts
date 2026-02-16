export interface SessionData {
	cookies: string | string[];
	timestamp: number;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface LoginFormData {
	requestVerificationToken: string;
	returnUrl: string;
}

export interface GeocacheFormData {
	[key: string]: string;
}

export type GeocacheFormDataResult =
	| { exists: false }
	| { exists: true; formData: GeocacheFormData };

export interface SearchResult {
	code: string;
	name: string;
	premiumOnly: boolean;
	distance: string;
}

export interface SearchOptions {
	includePremium: boolean;
}

export interface GeocacheInfo {
	code: string;
	name: string;
	premiumOnly: boolean;
	exists: boolean;
}

// Default HAR file path
export const DEFAULT_HAR_FILE_PATH = './jsmuggle.har';
