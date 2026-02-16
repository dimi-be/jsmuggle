import type { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';
import * as p from '@clack/prompts';
// @ts-ignore - geo-coordinates-parser doesn't have types
import { convert } from 'geo-coordinates-parser';
import type { SearchResult } from '../types/index.js';
import { saveSession } from './client.js';

// Cache for buildId to avoid fetching it multiple times
let cachedBuildId: string | null = null;

export function resetBuildIdCache(): void {
	cachedBuildId = null;
}

export async function extractBuildId(client: AxiosInstance): Promise<string> {
	// Return cached buildId if available
	if (cachedBuildId) {
		return cachedBuildId;
	}

	const response = await client.get(
		'https://www.geocaching.com/play/results',
		{
			maxRedirects: 0,
			validateStatus: (status) => status === 200 || status === 302,
		},
	);

	// Check if we were redirected to login page (session expired)
	if (response.status === 302) {
		throw new Error(
			'Authentication required. Please login first with: jsmuggle',
		);
	}

	const dom = new JSDOM(response.data);
	const scriptTag = dom.window.document.getElementById('__NEXT_DATA__');

	if (!scriptTag || !scriptTag.textContent) {
		throw new Error('Could not find __NEXT_DATA__ script tag');
	}

	const data = JSON.parse(scriptTag.textContent);
	const buildId = data.buildId;

	if (!buildId) {
		throw new Error('Could not extract buildId from page');
	}

	// Cache the buildId
	cachedBuildId = buildId;

	// Save session after request
	await saveSession(client);

	return buildId;
}

type SearchType = 'gc' | 'coordinates' | 'keyword';

interface SearchTypeResult {
	type: SearchType;
	searchValue: string;
	displayTerm: string;
}

export function detectSearchType(searchTerm: string): SearchTypeResult {
	const trimmedTerm = searchTerm.trim();

	// Check for GC code: starts with GC, followed by alphanumeric, max 14 chars
	const gcRegex = /^GC[A-Z0-9]+$/i;
	if (gcRegex.test(trimmedTerm) && trimmedTerm.length <= 14) {
		return {
			type: 'gc',
			searchValue: trimmedTerm.toUpperCase(),
			displayTerm: trimmedTerm.toUpperCase(),
		};
	}

	// Try to parse as coordinates
	try {
		const converted = convert(trimmedTerm);
		// Use decimal coordinates for the search
		const coordinateString = `${converted.decimalLatitude}, ${converted.decimalLongitude}`;
		return {
			type: 'coordinates',
			searchValue: coordinateString,
			displayTerm: `${trimmedTerm} (${coordinateString})`,
		};
	} catch {
		// Not valid coordinates, treat as keyword
	}

	// Default to keyword
	return {
		type: 'keyword',
		searchValue: trimmedTerm,
		displayTerm: trimmedTerm,
	};
}

export function getSearchUrl(
	buildId: string,
	searchType: SearchType,
	searchValue: string,
	radius?: number,
	skip: number = 0,
): string {
	let url: string;

	if (searchType === 'gc') {
		url = `https://www.geocaching.com/_next/data/${buildId}/en/play/results.json?ot=geocache&oid=${encodeURIComponent(searchValue)}&sort=distance&asc=true&skip=${skip}`;
	} else {
		// coordinates or keyword
		url = `https://www.geocaching.com/_next/data/${buildId}/en/play/results.json?ot=query&st=${encodeURIComponent(searchValue)}&sort=distance&asc=true&skip=${skip}`;
	}

	if (radius !== undefined) {
		url += `&r=${radius}`;
	}
	return url;
}

export function getRefererUrl(
	searchType: SearchType,
	searchValue: string,
	radius?: number,
): string {
	let url: string;

	if (searchType === 'gc') {
		url = `https://www.geocaching.com/play/results?ot=geocache&oid=${encodeURIComponent(searchValue)}&sort=distance&asc=true`;
	} else {
		url = `https://www.geocaching.com/play/results?ot=query&st=${encodeURIComponent(searchValue)}&sort=distance&asc=true`;
	}

	if (radius !== undefined) {
		url += `&r=${radius}`;
	}
	return url;
}

interface SearchPageResponse {
	results: SearchResult[];
	take: number;
	total: number;
	geocache?: {
		referenceCode: string;
		name: string;
		state?: {
			isPremiumOnly?: boolean;
		};
	};
}

async function fetchSearchPage(
	client: AxiosInstance,
	buildId: string,
	searchType: SearchType,
	searchValue: string,
	radius: number | undefined,
	skip: number,
): Promise<SearchPageResponse> {
	const url = getSearchUrl(buildId, searchType, searchValue, radius, skip);
	const referer = getRefererUrl(searchType, searchValue, radius);

	const response = await client.get(url, {
		maxRedirects: 0,
		validateStatus: (status) => status === 200 || status === 302,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Referer: referer,
		},
	});

	// Check if we were redirected to login page (session expired)
	if (response.status === 302) {
		throw new Error(
			'Authentication required. Please login first with: jsmuggle',
		);
	}

	const data = response.data;

	if (!data.pageProps?.searchResults) {
		throw new Error('Search results not found in response');
	}

	const searchResults = data.pageProps.searchResults.results.map(
		(item: any): SearchResult => ({
			code: item.code,
			name: item.name,
			premiumOnly: item.premiumOnly,
			distance: item.distance,
		}),
	);

	return {
		results: searchResults,
		take: data.pageProps.take || 20,
		total: data.pageProps.searchResults.total || 0,
		geocache: data.pageProps.geocache,
	};
}

interface SearchNearbyResult {
	results: SearchResult[];
	displayTerm: string;
}

export async function searchNearby(
	client: AxiosInstance,
	searchTerm: string,
	radius: number | undefined,
	limit: number,
	interactive: boolean,
	includePremium: boolean,
	delay: number = 1000,
): Promise<SearchNearbyResult> {
	// Detect search type
	const {
		type: searchType,
		searchValue,
		displayTerm,
	} = detectSearchType(searchTerm);

	// Extract buildId first
	const buildId = await extractBuildId(client);

	// Cap at 100 results in interactive mode
	const maxResults = interactive ? Math.min(limit, 100) : limit;

	if (interactive && limit > 100) {
		console.log(
			`Note: Limit capped at 100 results in interactive mode (requested ${limit})`,
		);
	}

	const apiResults: SearchResult[] = [];
	let skip = 0;
	let take = 20;
	let pageCount = 0;
	let referenceCache: SearchResult | null = null;

	// Fetch up to the limit (we'll add reference cache on top for GC searches)
	const apiLimit = maxResults;

	// Show initial spinner
	const s = p.spinner();
	s.start('Fetching results...');

	try {
		while (apiResults.length < apiLimit) {
			pageCount++;
			const pageData = await fetchSearchPage(
				client,
				buildId,
				searchType,
				searchValue,
				radius,
				skip,
			);

			// Extract reference cache from first page only (only for GC code searches)
			if (
				pageCount === 1 &&
				searchType === 'gc' &&
				pageData.geocache?.referenceCode
			) {
				referenceCache = {
					code: pageData.geocache.referenceCode,
					name: pageData.geocache.name,
					premiumOnly:
						pageData.geocache.state?.isPremiumOnly || false,
					distance: '0',
				};
			}

			// If no results, we've reached the last page
			if (pageData.results.length === 0) {
				break;
			}

			// Update take from first response
			if (pageCount === 1) {
				take = pageData.take;
			}

			apiResults.push(...pageData.results);

			// Update spinner with progress
			s.message(
				`Fetching page ${pageCount}... (${apiResults.length} results)`,
			);

			// Check if we have enough results or if this was the last page
			if (apiResults.length >= apiLimit) {
				break;
			}

			// Add delay between page requests (except after the last one)
			if (delay > 0) {
				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			// Prepare for next page
			skip += take;
		}

		// Slice API results to the limit (leave room for reference cache if GC search)
		const targetCount = referenceCache ? maxResults - 1 : maxResults;
		const limitedResults = apiResults.slice(0, targetCount);

		// Add reference cache to the beginning if found (only for GC code searches)
		if (referenceCache) {
			limitedResults.unshift(referenceCache);
		}

		// Filter out premium caches if not including them
		const filteredResults = includePremium
			? limitedResults
			: limitedResults.filter((r) => !r.premiumOnly);

		// Save session after all requests
		await saveSession(client);

		s.stop(`Found ${filteredResults.length} caches`);

		return {
			results: filteredResults,
			displayTerm,
		};
	} catch (error) {
		s.stop('Failed to fetch results');
		throw error;
	}
}

export function formatSearchResults(
	results: SearchResult[],
	includePremium: boolean,
): string[] {
	return results
		.filter((r) => includePremium || !r.premiumOnly)
		.map((r) => {
			const premiumMark = r.premiumOnly ? ' [P]' : '';
			return `${r.code}${premiumMark} ${r.name} (${r.distance})`;
		});
}
