import * as p from '@clack/prompts';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { AxiosInstance } from 'axios';
import { checkDirectory } from './fs.js';
import { extractGeocacheFormData } from '../scraper/geocache.js';
import { downloadGpx } from '../scraper/gpx.js';
import { promptOverwrite } from '../commands/download/prompts.js';
import { logError } from './error.js';

export interface DownloadOptions {
	directory?: string;
	delay?: number;
	force?: boolean;
	verbose?: boolean;
}

export interface DownloadResult {
	gcCode: string;
	success: boolean;
	error?: string;
}

/**
 * Validate that a file is a valid GPX file
 * @param filePath - Path to the file to validate
 * @returns true if valid GPX, false otherwise
 */
function validateGpxFile(filePath: string): boolean {
	try {
		const content = readFileSync(filePath, 'utf-8');

		// Check if content starts with XML declaration or <gpx tag
		if (
			!content.trim().startsWith('<?xml') &&
			!content.trim().startsWith('<gpx')
		) {
			return false;
		}

		// Check for GPX namespace
		const gpxMatch = content.match(
			/<gpx[^>]*xmlns="http:\/\/www\.topografix\.com\/GPX\/1\/[01]"/,
		);
		if (!gpxMatch) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

/**
 * Download GPX files for a list of GC codes
 * @param client - Axios instance with authentication
 * @param gcCodeList - Array of GC codes to download
 * @param options - Download options (directory, delay, force)
 * @returns Array of download results
 */
export async function downloadCaches(
	client: AxiosInstance,
	gcCodeList: string[],
	options: DownloadOptions,
): Promise<DownloadResult[]> {
	// Validate and resolve directory
	const directory = options.directory || process.cwd();
	const resolvedDir = resolve(directory);
	const dirCheck = await checkDirectory(resolvedDir);

	if (!dirCheck.exists) {
		console.log('Directory does not exist.');
		process.exit(1);
	}

	if (!dirCheck.writable) {
		console.log('Directory not writeable');
		process.exit(1);
	}

	const delay = options.delay || 1000;
	const force = options.force || false;
	const total = gcCodeList.length;
	const downloadResults: DownloadResult[] = [];

	p.intro(
		`Downloading ${total} cache${total > 1 ? 's' : ''} with ${delay}ms delay`,
	);

	for (let i = 0; i < gcCodeList.length; i++) {
		const gcCode = gcCodeList[i];
		const current = i + 1;
		const outputPath = join(resolvedDir, `${gcCode}.gpx`);

		const s = p.spinner();
		s.start(`Cache ${current}/${total}: ${gcCode}`);

		try {
			// Check if file already exists BEFORE extracting form data
			if (existsSync(outputPath) && !force) {
				s.stop(`Cache ${current}/${total}: ${gcCode} - File exists`);
				const shouldOverwrite = await promptOverwrite(gcCode);

				if (!shouldOverwrite) {
					s.stop(`⊘ Cache ${current}/${total}: ${gcCode} (skipped)`);
					downloadResults.push({
						gcCode,
						success: false,
						error: 'Skipped by user',
					});
					continue;
				}
				s.start(`Cache ${current}/${total}: ${gcCode}`);
			}

			// Extract form data (also checks if geocache exists)
			const result = await extractGeocacheFormData(client, gcCode);

			if (!result.exists) {
				throw new Error(`Cache ${gcCode} not found`);
			}

			// Download GPX
			await downloadGpx(client, gcCode, result.formData, outputPath);

			// Validate downloaded file is a valid GPX
			if (!validateGpxFile(outputPath)) {
				// Delete invalid file
				import('fs').then((fs) => {
					try {
						fs.unlinkSync(outputPath);
					} catch {
						// Ignore deletion errors
					}
				});
				throw new Error('Downloaded file is not a valid GPX file');
			}

			s.stop(`✓ Cache ${current}/${total}: ${gcCode}`);
			downloadResults.push({ gcCode, success: true });

			// Add delay between downloads (except for the last one)
			if (i < gcCodeList.length - 1 && delay > 0) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		} catch (error) {
			s.stop(`✗ Cache ${current}/${total}: ${gcCode}`);
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			downloadResults.push({
				gcCode,
				success: false,
				error: errorMessage,
			});

			if (!force) {
				logError(
					`\nDownload failed for ${gcCode}: ${errorMessage}`,
					error,
					{ verbose: options.verbose },
				);
				process.exit(1);
			}
		}
	}

	// Summary
	const successful = downloadResults.filter((r) => r.success).length;
	const failed = downloadResults.filter((r) => !r.success).length;

	p.outro(`Download complete: ${successful} succeeded, ${failed} failed`);

	if (failed > 0) {
		console.log('\nFailed downloads:');
		downloadResults
			.filter((r) => !r.success)
			.forEach((r) => {
				console.log(`  ✗ ${r.gcCode}: ${r.error}`);
			});
	}

	if (failed > 0) {
		process.exit(1);
	}

	return downloadResults;
}
