import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	searchNearby,
	formatSearchResults,
	getSearchUrl,
	getRefererUrl,
	extractBuildId,
	resetBuildIdCache,
	detectSearchType,
} from '../search.js';

type MockClient = {
	get: ReturnType<typeof vi.fn>;
};

// Mock saveSession
vi.mock('../client.js', () => ({
	saveSession: vi.fn(),
}));

// Mock clack/prompts
vi.mock('@clack/prompts', () => ({
	spinner: () => ({
		start: vi.fn(),
		message: vi.fn(),
		stop: vi.fn(),
	}),
}));

const TEST_BUILD_ID = 'test-build-id-12345';

const createBuildIdHtml = (buildId: string = TEST_BUILD_ID) => `<!DOCTYPE html>
<html>
<head>
	<title>Search Results</title>
</head>
<body>
	<div id="app"></div>
	<script id="__NEXT_DATA__" type="application/json">
{
	"buildId": "${buildId}",
	"pageProps": {}
}
	</script>
</body>
</html>`;

describe('detectSearchType', () => {
	it('should detect GC code', () => {
		const result = detectSearchType('GC13Y2Y');
		expect(result.type).toBe('gc');
		expect(result.searchValue).toBe('GC13Y2Y');
		expect(result.displayTerm).toBe('GC13Y2Y');
	});

	it('should detect GC code case insensitive', () => {
		const result = detectSearchType('gc13y2y');
		expect(result.type).toBe('gc');
		expect(result.searchValue).toBe('GC13Y2Y');
	});

	it('should detect coordinates', () => {
		const result = detectSearchType('40° 26.7717, -79° 56.93172');
		expect(result.type).toBe('coordinates');
		expect(result.searchValue).toContain(',');
		expect(result.displayTerm).toContain('40° 26.7717');
	});

	it('should treat invalid coordinates as keyword', () => {
		const result = detectSearchType('Seattle');
		expect(result.type).toBe('keyword');
		expect(result.searchValue).toBe('Seattle');
		expect(result.displayTerm).toBe('Seattle');
	});

	it('should treat long strings as keyword', () => {
		const longString = 'G' + 'C'.repeat(20); // More than 14 chars
		const result = detectSearchType(longString);
		expect(result.type).toBe('keyword');
	});
});

describe('extractBuildId', () => {
	let mockClient: MockClient;

	beforeEach(() => {
		resetBuildIdCache();
		mockClient = {
			get: vi.fn(),
		};
	});

	it('should extract buildId from __NEXT_DATA__', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: createBuildIdHtml('abc123'),
		});

		const buildId = await extractBuildId(mockClient as any);

		expect(buildId).toBe('abc123');
		expect(mockClient.get).toHaveBeenCalledWith(
			'https://www.geocaching.com/play/results',
			expect.any(Object),
		);
	});

	it('should throw error if __NEXT_DATA__ is missing', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: '<html><body>No script tag</body></html>',
		});

		await expect(extractBuildId(mockClient as any)).rejects.toThrow(
			'Could not find __NEXT_DATA__ script tag',
		);
	});

	it('should throw error if buildId is missing', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: '<html><body><script id="__NEXT_DATA__">{"pageProps": {}}</script></body></html>',
		});

		await expect(extractBuildId(mockClient as any)).rejects.toThrow(
			'Could not extract buildId from page',
		);
	});

	it('should throw error on 302 redirect', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 302,
			headers: { location: '/account/signin' },
		});

		await expect(extractBuildId(mockClient as any)).rejects.toThrow(
			'Authentication required. Please login first',
		);
	});
});

describe('getSearchUrl', () => {
	it('should return correct JSON URL for GC code', () => {
		const url = getSearchUrl(TEST_BUILD_ID, 'gc', 'GC13Y2Y');
		expect(url).toContain('https://www.geocaching.com/_next/data/');
		expect(url).toContain('/en/play/results.json?ot=geocache&oid=GC13Y2Y');
	});

	it('should return correct JSON URL for coordinates', () => {
		const url = getSearchUrl(
			TEST_BUILD_ID,
			'coordinates',
			'40.446, -79.948',
		);
		expect(url).toContain('ot=query');
		expect(url).toContain('st=40.446%2C%20-79.948');
	});

	it('should return correct JSON URL for keyword', () => {
		const url = getSearchUrl(TEST_BUILD_ID, 'keyword', 'Seattle');
		expect(url).toContain('ot=query');
		expect(url).toContain('st=Seattle');
	});

	it('should include radius parameter when provided', () => {
		const url = getSearchUrl(TEST_BUILD_ID, 'gc', 'GC13Y2Y', 10);
		expect(url).toContain('&r=10');
	});

	it('should include skip parameter', () => {
		const url = getSearchUrl(TEST_BUILD_ID, 'gc', 'GC13Y2Y', undefined, 20);
		expect(url).toContain('&skip=20');
	});
});

describe('getRefererUrl', () => {
	it('should return correct referer URL for GC code', () => {
		const url = getRefererUrl('gc', 'GC13Y2Y', 10);
		expect(url).toContain('ot=geocache');
		expect(url).toContain('oid=GC13Y2Y');
	});

	it('should return correct referer URL for keyword', () => {
		const url = getRefererUrl('keyword', 'Seattle', 10);
		expect(url).toContain('ot=query');
		expect(url).toContain('st=Seattle');
	});
});

describe('searchNearby', () => {
	let mockClient: MockClient;

	const createMockResponse = (
		results: any[],
		take: number = 20,
		total: number = 0,
		geocache?: any,
	) => ({
		pageProps: {
			geocache,
			take,
			searchResults: {
				results,
				total,
			},
		},
	});

	const mockGeocache = {
		referenceCode: 'GC13Y2Y',
		name: 'Reference Cache',
		state: {
			isPremiumOnly: false,
		},
	};

	beforeEach(() => {
		resetBuildIdCache();
		mockClient = {
			get: vi.fn(),
		};
	});

	const setupMockClient = (responses: any[]) => {
		// First call is for buildId extraction
		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: createBuildIdHtml(),
		});

		// Subsequent calls are for search results
		responses.forEach((response) => {
			mockClient.get.mockResolvedValueOnce(response);
		});
	};

	it('should return parsed search results for GC code with reference cache', async () => {
		const mockResults = [
			{
				code: 'GC12345',
				name: 'Cache One',
				premiumOnly: false,
				distance: '1.3mi',
			},
			{
				code: 'GC67890',
				name: 'Cache Two',
				premiumOnly: true,
				distance: '2.6km',
			},
		];

		setupMockClient([
			{
				status: 200,
				data: createMockResponse(mockResults, 20, 2, mockGeocache),
			},
			{ status: 200, data: createMockResponse([], 20, 2) },
		]);

		const { results, displayTerm } = await searchNearby(
			mockClient as any,
			'GC13Y2Y',
			10,
			20,
			false,
			false,
			0,
		);

		expect(results).toHaveLength(2);
		expect(results[0]).toEqual({
			code: 'GC13Y2Y',
			name: 'Reference Cache',
			premiumOnly: false,
			distance: '0',
		});
		expect(displayTerm).toBe('GC13Y2Y');
	});

	it('should return results for keyword search without reference cache', async () => {
		const mockResults = [
			{
				code: 'GC12345',
				name: 'Cache One',
				premiumOnly: false,
				distance: '1.3mi',
			},
		];

		setupMockClient([
			{ status: 200, data: createMockResponse(mockResults, 20, 1) },
			{ status: 200, data: createMockResponse([], 20, 1) },
		]);

		const { results, displayTerm } = await searchNearby(
			mockClient as any,
			'Seattle',
			10,
			20,
			false,
			0,
		);

		expect(results).toHaveLength(1);
		expect(results[0].code).toBe('GC12345');
		expect(displayTerm).toBe('Seattle');
	});

	it('should handle pagination when limit requires multiple pages', async () => {
		setupMockClient([
			{
				status: 200,
				data: createMockResponse(
					[
						{
							code: 'GC1',
							name: 'Cache 1',
							premiumOnly: false,
							distance: '1mi',
						},
						{
							code: 'GC2',
							name: 'Cache 2',
							premiumOnly: false,
							distance: '2mi',
						},
					],
					2,
					4,
					mockGeocache,
				),
			},
			{
				status: 200,
				data: createMockResponse(
					[
						{
							code: 'GC3',
							name: 'Cache 3',
							premiumOnly: false,
							distance: '3mi',
						},
						{
							code: 'GC4',
							name: 'Cache 4',
							premiumOnly: false,
							distance: '4mi',
						},
					],
					2,
					4,
				),
			},
		]);

		const { results } = await searchNearby(
			mockClient as any,
			'GC13Y2Y',
			10,
			4,
			false,
			0,
		);

		expect(results).toHaveLength(4);
		expect(mockClient.get).toHaveBeenCalledTimes(3);
	});

	it('should cap at 100 results in interactive mode', async () => {
		const page1Results = Array.from({ length: 50 }, (_, i) => ({
			code: `GC${i + 1}`,
			name: `Cache ${i + 1}`,
			premiumOnly: false,
			distance: `${i + 1}mi`,
		}));
		const page2Results = Array.from({ length: 50 }, (_, i) => ({
			code: `GC${i + 51}`,
			name: `Cache ${i + 51}`,
			premiumOnly: false,
			distance: `${i + 51}mi`,
		}));

		setupMockClient([
			{
				status: 200,
				data: createMockResponse(page1Results, 50, 150, mockGeocache),
			},
			{ status: 200, data: createMockResponse(page2Results, 50, 150) },
			{ status: 200, data: createMockResponse([], 50, 150) },
		]);

		const { results } = await searchNearby(
			mockClient as any,
			'GC13Y2Y',
			10,
			150,
			true,
			0,
		);

		expect(results).toHaveLength(100);
	});

	it('should throw error when redirected to login (302)', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: createBuildIdHtml(),
		});
		mockClient.get.mockResolvedValueOnce({
			status: 302,
			headers: { location: '/account/signin' },
		});

		await expect(
			searchNearby(mockClient as any, 'GC13Y2Y', 10, 20, false, 0),
		).rejects.toThrow('Authentication required. Please login first');
	});
});

describe('formatSearchResults', () => {
	const mockResults = [
		{
			code: 'GC13Y2Y',
			name: 'Reference Cache',
			premiumOnly: false,
			distance: '0',
		},
		{
			code: 'GC11111',
			name: 'Test Cache Three',
			premiumOnly: false,
			distance: '400ft',
		},
		{
			code: 'GC12345',
			name: 'Test Cache One',
			premiumOnly: false,
			distance: '1.3mi',
		},
		{
			code: 'GC67890',
			name: 'Test Cache Two',
			premiumOnly: true,
			distance: '2.6km',
		},
	];

	it('should include all caches with [P] marker for premium when includePremium is true', () => {
		const formatted = formatSearchResults(mockResults, true);

		expect(formatted).toHaveLength(4);
		expect(formatted[0]).toBe('GC13Y2Y Reference Cache (0)');
		expect(formatted[1]).toBe('GC11111 Test Cache Three (400ft)');
		expect(formatted[2]).toBe('GC12345 Test Cache One (1.3mi)');
		expect(formatted[3]).toBe('GC67890 [P] Test Cache Two (2.6km)');
	});

	it('should filter out premium caches when includePremium is false', () => {
		const formatted = formatSearchResults(mockResults, false);

		expect(formatted).toHaveLength(3);
		expect(formatted[0]).toBe('GC13Y2Y Reference Cache (0)');
		expect(formatted[1]).toBe('GC11111 Test Cache Three (400ft)');
		expect(formatted[2]).toBe('GC12345 Test Cache One (1.3mi)');
	});

	it('should handle empty results', () => {
		const formatted = formatSearchResults([], false);
		expect(formatted).toHaveLength(0);
	});
});
