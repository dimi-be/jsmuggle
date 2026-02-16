import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractGeocacheFormData, getGeocacheUrl } from '../geocache.js';

type MockClient = {
	get: ReturnType<typeof vi.fn>;
	defaults: {
		jar: {
			setCookie: ReturnType<typeof vi.fn>;
		};
	};
};

// Mock saveSession
vi.mock('../client.js', () => ({
	saveSession: vi.fn(),
}));

describe('getGeocacheUrl', () => {
	it('should return correct URL for GC code', () => {
		const url = getGeocacheUrl('GC13Y2Y');
		expect(url).toBe('https://www.geocaching.com/geocache/GC13Y2Y');
	});

	it('should handle different GC codes', () => {
		expect(getGeocacheUrl('GC12345')).toBe(
			'https://www.geocaching.com/geocache/GC12345',
		);
		expect(getGeocacheUrl('GC99999')).toBe(
			'https://www.geocaching.com/geocache/GC99999',
		);
	});
});

describe('extractGeocacheFormData', () => {
	let mockClient: MockClient;

	const geocachePageHtml = `<!DOCTYPE html>
<html>
<head>
	<title>GC13Y2Y - Test Geocache</title>
</head>
<body>
	<form id="aspnetForm" method="post" action="/geocache/GC13Y2Y">
		<input type="hidden" name="__VIEWSTATE" value="test-viewstate-123" />
		<input type="hidden" name="__VIEWSTATEGENERATOR" value="test-generator-456" />
		<input type="hidden" name="__EVENTVALIDATION" value="test-validation-789" />
		<input type="hidden" name="__RequestVerificationToken" value="geocache-csrf-token-abc" />
		<input type="hidden" name="ctl00$ContentBody$btnSend" value="" />
	</form>
</body>
</html>`;

	beforeEach(() => {
		mockClient = {
			get: vi.fn(),
			defaults: {
				jar: {
					setCookie: vi.fn(),
				},
			},
		};
	});

	it('should return exists=false for 404 response', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 404,
		});

		const result = await extractGeocacheFormData(
			mockClient as any,
			'GC13Y2Y',
		);

		expect(result).toEqual({ exists: false });
	});

	it('should extract form data and set CSRF cookie on success', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: geocachePageHtml,
		});

		const result = await extractGeocacheFormData(
			mockClient as any,
			'GC13Y2Y',
		);

		expect(result.exists).toBe(true);
		if (result.exists) {
			expect(result.formData).toEqual({
				__VIEWSTATE: 'test-viewstate-123',
				__VIEWSTATEGENERATOR: 'test-generator-456',
				__EVENTVALIDATION: 'test-validation-789',
				__RequestVerificationToken: 'geocache-csrf-token-abc',
				ctl00$ContentBody$btnSend: '',
				__EVENTTARGET: 'ctl00$ContentBody$lnkGpxDownload',
			});
		}

		expect(mockClient.defaults.jar.setCookie).toHaveBeenCalledWith(
			'__RequestVerificationToken=geocache-csrf-token-abc; Path=/; Domain=.geocaching.com',
			'https://www.geocaching.com',
		);
	});

	it('should throw error when form is not found', async () => {
		const htmlWithoutForm = '<html><body>No form here</body></html>';

		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: htmlWithoutForm,
		});

		await expect(
			extractGeocacheFormData(mockClient as any, 'GC13Y2Y'),
		).rejects.toThrow('Geocache form not found on page');
	});

	it('should handle missing CSRF token gracefully', async () => {
		const htmlWithoutCsrf = `
			<!DOCTYPE html>
			<html>
			<body>
				<form id="aspnetForm">
					<input type="hidden" name="__VIEWSTATE" value="test" />
				</form>
			</body>
			</html>
		`;

		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: htmlWithoutCsrf,
		});

		const result = await extractGeocacheFormData(
			mockClient as any,
			'GC13Y2Y',
		);

		expect(result.exists).toBe(true);
		if (result.exists) {
			expect(result.formData.__RequestVerificationToken).toBeUndefined();
			expect(result.formData.__EVENTTARGET).toBe(
				'ctl00$ContentBody$lnkGpxDownload',
			);
		}
	});

	it('should call geocache URL with correct config', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: geocachePageHtml,
		});

		await extractGeocacheFormData(mockClient as any, 'GC13Y2Y');

		expect(mockClient.get).toHaveBeenCalledWith(
			'https://www.geocaching.com/geocache/GC13Y2Y',
			expect.objectContaining({
				maxRedirects: 0,
				validateStatus: expect.any(Function),
			}),
		);
	});

	it('should propagate errors from HTTP request', async () => {
		mockClient.get.mockRejectedValueOnce(new Error('Network error'));

		await expect(
			extractGeocacheFormData(mockClient as any, 'GC13Y2Y'),
		).rejects.toThrow('Network error');
	});
});
