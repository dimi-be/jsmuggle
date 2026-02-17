import type { AxiosInstance } from 'axios';
import { parseHTML } from 'linkedom';
import { CookieJar } from 'tough-cookie';
import type {
	GeocacheFormData,
	GeocacheFormDataResult,
	GeocacheInfo,
} from '../types/index.js';
import { saveSession } from './client.js';

export function getGeocacheUrl(gcCode: string): string {
	return `https://www.geocaching.com/geocache/${gcCode}`;
}

export async function extractGeocacheFormData(
	client: AxiosInstance,
	gcCode: string,
): Promise<GeocacheFormDataResult> {
	try {
		const response = await client.get(getGeocacheUrl(gcCode), {
			maxRedirects: 0,
			validateStatus: (status) => status === 200 || status === 404,
		});

		// Check if geocache exists (404 means not found)
		if (response.status === 404) {
			return { exists: false };
		}

		const { document } = parseHTML(response.data);

		const form = document.getElementById('aspnetForm');
		if (!form) {
			throw new Error('Geocache form not found on page');
		}

		const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
		const formData: GeocacheFormData = {};

		hiddenInputs.forEach((input) => {
			const name = (input as HTMLInputElement).name;
			const value = (input as HTMLInputElement).value;
			if (name) {
				formData[name] = value;
			}
		});

		// Ensure __EVENTTARGET is set for GPX download
		formData['__EVENTTARGET'] = 'ctl00$ContentBody$lnkGpxDownload';

		// Manually set CSRF token as cookie (normally set by JavaScript in browser)
		const csrfToken = formData['__RequestVerificationToken'];
		if (csrfToken) {
			const jar = (client.defaults as unknown as { jar: CookieJar }).jar;
			if (jar) {
				await jar.setCookie(
					`__RequestVerificationToken=${csrfToken}; Path=/; Domain=.geocaching.com`,
					'https://www.geocaching.com',
				);
			}
		}

		// Save session to persist cookies including the CSRF token
		await saveSession(client);

		return { exists: true, formData };
	} catch (error) {
		throw error;
	}
}

export async function extractGeocacheInfo(
	client: AxiosInstance,
	gcCode: string,
): Promise<GeocacheInfo> {
	try {
		const response = await client.get(getGeocacheUrl(gcCode), {
			maxRedirects: 0,
			validateStatus: (status) => status === 200 || status === 404,
		});

		// Check if geocache exists (404 means not found)
		if (response.status === 404) {
			return {
				code: gcCode,
				name: '',
				premiumOnly: false,
				exists: false,
			};
		}

		const { document } = parseHTML(response.data);

		// Extract cache name
		const cacheNameElement = document.getElementById(
			'ctl00_ContentBody_CacheName',
		);
		const name = cacheNameElement?.textContent?.trim() || '';

		// Check for premium status
		const premiumWidget = document.querySelector(
			'section.premium-upgrade-widget',
		);
		const premiumOnly = premiumWidget !== null;

		// Save session after request
		await saveSession(client);

		return { code: gcCode, name, premiumOnly, exists: true };
	} catch (error) {
		throw error;
	}
}
