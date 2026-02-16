import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractLoginFormData, performLogin } from '../login.js';

// Type for mocked axios client
type MockClient = {
	get: ReturnType<typeof vi.fn>;
	post: ReturnType<typeof vi.fn>;
};

describe('extractLoginFormData', () => {
	let mockClient: MockClient;

	const loginPageHtml = `<!DOCTYPE html>
<html>
<head>
	<title>Sign In - Geocaching</title>
</head>
<body>
	<form id="SignupSignin" method="post" action="/account/signin">
		<input type="hidden" name="__RequestVerificationToken" value="test-csrf-token-12345" />
		<input type="hidden" name="ReturnUrl" value="/account/settings/profile" />
		<button type="submit">Sign In</button>
	</form>
</body>
</html>`;

	beforeEach(() => {
		mockClient = {
			get: vi.fn(),
			post: vi.fn(),
		};
	});

	it('should extract CSRF token and ReturnUrl from login page', async () => {
		mockClient.get.mockResolvedValueOnce({ data: loginPageHtml });

		const result = await extractLoginFormData(mockClient as any);

		expect(result).toEqual({
			requestVerificationToken: 'test-csrf-token-12345',
			returnUrl: '/account/settings/profile',
		});
		expect(mockClient.get).toHaveBeenCalledWith(
			'https://www.geocaching.com/account/signin',
		);
	});

	it('should use default returnUrl when not present', async () => {
		const htmlWithoutReturnUrl = `
			<!DOCTYPE html>
			<html>
			<body>
				<form id="SignupSignin">
					<input type="hidden" name="__RequestVerificationToken" value="test-token" />
				</form>
			</body>
			</html>
		`;

		mockClient.get.mockResolvedValueOnce({ data: htmlWithoutReturnUrl });

		const result = await extractLoginFormData(mockClient as any);

		expect(result.returnUrl).toBe('/');
	});

	it('should throw error when form is not found', async () => {
		const htmlWithoutForm = '<html><body>No form here</body></html>';
		mockClient.get.mockResolvedValueOnce({ data: htmlWithoutForm });

		await expect(extractLoginFormData(mockClient as any)).rejects.toThrow(
			'Login form not found on page',
		);
	});

	it('should throw error when CSRF token is missing', async () => {
		const htmlWithoutToken = `
			<!DOCTYPE html>
			<html>
			<body>
				<form id="SignupSignin">
					<input type="hidden" name="ReturnUrl" value="/test" />
				</form>
			</body>
			</html>
		`;
		mockClient.get.mockResolvedValueOnce({ data: htmlWithoutToken });

		await expect(extractLoginFormData(mockClient as any)).rejects.toThrow(
			'Request verification token not found',
		);
	});
});

describe('performLogin', () => {
	let mockClient: MockClient;

	beforeEach(() => {
		mockClient = {
			get: vi.fn(),
			post: vi.fn(),
		};
	});

	it('should return true on successful login (302 redirect)', async () => {
		mockClient.post.mockResolvedValueOnce({ status: 302 });

		const result = await performLogin(
			mockClient as any,
			'testuser',
			'testpass',
			{
				requestVerificationToken: 'token123',
				returnUrl: '/profile',
			},
		);

		expect(result).toBe(true);
		expect(mockClient.post).toHaveBeenCalledWith(
			'https://www.geocaching.com/account/signin',
			expect.stringContaining('UsernameOrEmail=testuser'),
			expect.objectContaining({
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Referer: 'https://www.geocaching.com/account/signin',
				},
			}),
		);
	});

	it('should return false on failed login (non-302 status)', async () => {
		mockClient.post.mockResolvedValueOnce({ status: 200 });

		const result = await performLogin(
			mockClient as any,
			'testuser',
			'wrongpass',
			{
				requestVerificationToken: 'token123',
				returnUrl: '/profile',
			},
		);

		expect(result).toBe(false);
	});

	it('should return false on network error', async () => {
		mockClient.post.mockRejectedValueOnce(new Error('Network error'));

		const result = await performLogin(
			mockClient as any,
			'testuser',
			'testpass',
			{
				requestVerificationToken: 'token123',
				returnUrl: '/profile',
			},
		);

		expect(result).toBe(false);
	});

	it('should include all required form fields in POST body', async () => {
		mockClient.post.mockResolvedValueOnce({ status: 302 });

		await performLogin(mockClient as any, 'myuser', 'mypassword', {
			requestVerificationToken: 'csrf-token-xyz',
			returnUrl: '/account/settings/profile',
		});

		const postBody = mockClient.post.mock.calls[0][1] as string;

		expect(postBody).toContain('UsernameOrEmail=myuser');
		expect(postBody).toContain('Password=mypassword');
		expect(postBody).toContain('__RequestVerificationToken=csrf-token-xyz');
		expect(postBody).toContain('ReturnUrl=%2Faccount%2Fsettings%2Fprofile');
	});
});
