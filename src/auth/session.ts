import type { AxiosInstance } from 'axios';

const PROFILE_URL = 'https://www.geocaching.com/account/settings/profile';
const SIGNIN_URL = 'https://www.geocaching.com/account/signin';

export async function validateSession(
	client: AxiosInstance,
): Promise<{ valid: boolean; username?: string }> {
	try {
		const response = await client.get(PROFILE_URL, {
			maxRedirects: 0,
			validateStatus: (status) => status === 200 || status === 302,
		});

		// If we get a 302 redirect to signin, session is invalid
		if (response.status === 302) {
			const location = response.headers.location;
			if (location && location.includes('signin')) {
				return { valid: false };
			}
		}

		// If we get 200, try to extract username
		if (response.status === 200) {
			// Try to extract username from window.chromeSettings JSON in script tag
			const chromeSettingsMatch = response.data.match(
				/window\.chromeSettings\s*=\s*(\{[\s\S]*?\});/,
			);
			if (chromeSettingsMatch) {
				try {
					const settings = JSON.parse(chromeSettingsMatch[1]);
					if (settings.username) {
						return { valid: true, username: settings.username };
					}
				} catch (e) {
					// Fallback: direct regex for username field
					const usernameMatch = response.data.match(
						/"username":\s*"([^"]+)"/,
					);
					if (usernameMatch) {
						return { valid: true, username: usernameMatch[1] };
					}
				}
			}
		}

		return { valid: false };
	} catch (error) {
		return { valid: false };
	}
}

export async function getUsername(
	client: AxiosInstance,
): Promise<string | undefined> {
	const result = await validateSession(client);
	return result.username;
}
