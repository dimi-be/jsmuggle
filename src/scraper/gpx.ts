import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import type { AxiosInstance } from 'axios';
import type { GeocacheFormData } from '../types/index.js';
import { getGeocacheUrl } from './geocache.js';

export async function downloadGpx(
	client: AxiosInstance,
	gcCode: string,
	formData: GeocacheFormData,
	outputPath: string,
): Promise<void> {
	const url = getGeocacheUrl(gcCode);

	const params = new URLSearchParams();
	Object.entries(formData).forEach(([key, value]) => {
		params.append(key, value);
	});

	try {
		const response = await client.post(url, params.toString(), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Referer: url,
				Host: 'www.geocaching.com',
				Origin: 'https://www.geocaching.com',
			},
			responseType: 'stream',
		});

		const writer = createWriteStream(outputPath);
		await pipeline(response.data as NodeJS.ReadableStream, writer);
	} catch (error) {
		throw error;
	}
}
