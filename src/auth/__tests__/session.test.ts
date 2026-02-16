import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateSession, getUsername } from '../session.js';

type MockClient = {
	get: ReturnType<typeof vi.fn>;
};

describe('validateSession', () => {
	let mockClient: MockClient;

	const profilePageHtml = `<!DOCTYPE html>
<html>
<head>
	<title>Profile Settings - Geocaching</title>
</head>
<body>
	<h1>Account Settings</h1>
	
	<script>
		window.chromeSettings = {
			"userId": 12345,
			"username": "TestUser",
			"userPublicGuid": "d1610ff3-6335-4468-8188-cb4c7c967751",
			"isAuthenticated": true,
			"showRenew": true
		};
		window.showSearchAnywhere = false;
	</script>
</body>
</html>`;

	beforeEach(() => {
		mockClient = {
			get: vi.fn(),
		};
	});

	it('should return valid session with username when profile page loads successfully', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: profilePageHtml,
		});

		const result = await validateSession(mockClient as any);

		expect(result).toEqual({
			valid: true,
			username: 'TestUser',
		});
	});

	it('should return invalid session when redirected to signin (302)', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 302,
			headers: {
				location:
					'https://www.geocaching.com/account/signin?returnUrl=%2Faccount%2Fsettings%2Fprofile',
			},
		});

		const result = await validateSession(mockClient as any);

		expect(result).toEqual({ valid: false });
	});

	it('should return invalid session when redirect location does not contain signin', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 302,
			headers: {
				location: 'https://www.geocaching.com/some-other-page',
			},
		});

		const result = await validateSession(mockClient as any);

		expect(result).toEqual({ valid: false });
	});

	it('should extract username using fallback regex when JSON parsing fails', async () => {
		const htmlWithInvalidJSON = `
			<!DOCTYPE html>
			<html>
			<body>
				<script>
					window.chromeSettings = { invalid json };
				</script>
				<script>
					var userData = {
						"username": "FallbackUser"
					};
				</script>
			</body>
			</html>
		`;

		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: htmlWithInvalidJSON,
		});

		const result = await validateSession(mockClient as any);

		expect(result).toEqual({
			valid: true,
			username: 'FallbackUser',
		});
	});

	it('should return invalid session when no username found in page', async () => {
		const htmlWithoutUsername = `
			<!DOCTYPE html>
			<html>
			<body>
				<h1>Profile</h1>
			</body>
			</html>
		`;

		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: htmlWithoutUsername,
		});

		const result = await validateSession(mockClient as any);

		expect(result).toEqual({ valid: false });
	});

	it('should return invalid session on network error', async () => {
		mockClient.get.mockRejectedValueOnce(new Error('Network error'));

		const result = await validateSession(mockClient as any);

		expect(result).toEqual({ valid: false });
	});

	it('should call profile URL with correct config', async () => {
		mockClient.get.mockRejectedValueOnce(new Error('Network error'));

		await validateSession(mockClient as any);

		expect(mockClient.get).toHaveBeenCalledWith(
			'https://www.geocaching.com/account/settings/profile',
			expect.objectContaining({
				maxRedirects: 0,
				validateStatus: expect.any(Function),
			}),
		);
	});
});

describe('getUsername', () => {
	let mockClient: MockClient;

	beforeEach(() => {
		mockClient = {
			get: vi.fn(),
		};
	});

	it('should return username when session is valid', async () => {
		const profilePageHtml = `<!DOCTYPE html>
		<html>
		<body>
			<script>
				window.chromeSettings = {
					"username": "TestUser"
				};
			</script>
		</body>
		</html>`;

		mockClient.get.mockResolvedValueOnce({
			status: 200,
			data: profilePageHtml,
		});

		const result = await getUsername(mockClient as any);

		expect(result).toBe('TestUser');
	});

	it('should return undefined when session is invalid', async () => {
		mockClient.get.mockResolvedValueOnce({
			status: 302,
			headers: { location: '/account/signin' },
		});

		const result = await getUsername(mockClient as any);

		expect(result).toBeUndefined();
	});
});
