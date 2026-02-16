import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosInstance } from 'axios';
import {
	ensureAuthenticated,
	validateSession,
	extractLoginFormData,
	performLogin,
} from '../index.js';
import * as sessionModule from '../session.js';
import * as loginModule from '../login.js';
import { createClient, saveSession } from '../../scraper/client.js';

// Mock dependencies
vi.mock('../session.js', () => ({
	validateSession: vi.fn(),
}));

vi.mock('../login.js', () => ({
	extractLoginFormData: vi.fn(),
	performLogin: vi.fn(),
}));

vi.mock('../../scraper/client.js', () => ({
	saveSession: vi.fn(),
}));

vi.mock('../../commands/auth/prompts.js', () => ({
	promptCredentials: vi.fn(),
}));

import { promptCredentials } from '../../commands/auth/prompts.js';

describe('ensureAuthenticated', () => {
	const mockClient = {} as AxiosInstance;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return true when session is already valid', async () => {
		vi.mocked(validateSession).mockResolvedValueOnce({
			valid: true,
			username: 'ExistingUser',
		});

		const result = await ensureAuthenticated(mockClient, {});

		expect(result).toBe(true);
		expect(validateSession).toHaveBeenCalledWith(mockClient);
	});

	it('should login with provided credentials when session is invalid', async () => {
		vi.mocked(validateSession)
			.mockResolvedValueOnce({ valid: false }) // First check fails
			.mockResolvedValueOnce({ valid: true, username: 'TestUser' }); // Second check succeeds

		vi.mocked(extractLoginFormData).mockResolvedValueOnce({
			requestVerificationToken: 'token123',
			returnUrl: '/profile',
		});

		vi.mocked(performLogin).mockResolvedValueOnce(true);

		const result = await ensureAuthenticated(mockClient, {
			username: 'testuser',
			password: 'testpass',
		});

		expect(result).toBe(true);
		expect(performLogin).toHaveBeenCalledWith(
			mockClient,
			'testuser',
			'testpass',
			{ requestVerificationToken: 'token123', returnUrl: '/profile' },
		);
		expect(saveSession).toHaveBeenCalledWith(mockClient);
	});

	it('should prompt for credentials when not provided and session is invalid', async () => {
		vi.mocked(validateSession)
			.mockResolvedValueOnce({ valid: false })
			.mockResolvedValueOnce({ valid: true, username: 'PromptedUser' });

		vi.mocked(promptCredentials).mockResolvedValueOnce({
			username: 'prompteduser',
			password: 'promptedpass',
		});

		vi.mocked(extractLoginFormData).mockResolvedValueOnce({
			requestVerificationToken: 'token123',
			returnUrl: '/profile',
		});

		vi.mocked(performLogin).mockResolvedValueOnce(true);

		const result = await ensureAuthenticated(mockClient, {});

		expect(result).toBe(true);
		expect(promptCredentials).toHaveBeenCalled();
		expect(performLogin).toHaveBeenCalledWith(
			mockClient,
			'prompteduser',
			'promptedpass',
			expect.any(Object),
		);
	});

	it('should return false when login fails', async () => {
		vi.mocked(validateSession).mockResolvedValueOnce({ valid: false });

		vi.mocked(extractLoginFormData).mockResolvedValueOnce({
			requestVerificationToken: 'token123',
			returnUrl: '/profile',
		});

		vi.mocked(performLogin).mockResolvedValueOnce(false);

		const result = await ensureAuthenticated(mockClient, {
			username: 'testuser',
			password: 'wrongpass',
		});

		expect(result).toBe(false);
		expect(saveSession).not.toHaveBeenCalled();
	});

	it('should return false when post-login session validation fails', async () => {
		vi.mocked(validateSession)
			.mockResolvedValueOnce({ valid: false })
			.mockResolvedValueOnce({ valid: false }); // Post-login check fails

		vi.mocked(extractLoginFormData).mockResolvedValueOnce({
			requestVerificationToken: 'token123',
			returnUrl: '/profile',
		});

		vi.mocked(performLogin).mockResolvedValueOnce(true);

		const result = await ensureAuthenticated(mockClient, {
			username: 'testuser',
			password: 'testpass',
		});

		expect(result).toBe(false);
	});

	it('should handle errors during login process gracefully', async () => {
		vi.mocked(validateSession).mockResolvedValueOnce({ valid: false });
		vi.mocked(extractLoginFormData).mockRejectedValueOnce(
			new Error('Network error'),
		);

		const result = await ensureAuthenticated(mockClient, {
			username: 'testuser',
			password: 'testpass',
		});

		expect(result).toBe(false);
	});
});

// Re-export tests
// Note: These are just verifying that the re-exports work
describe('module re-exports', () => {
	it('should re-export validateSession', () => {
		expect(typeof validateSession).toBe('function');
	});

	it('should re-export extractLoginFormData', () => {
		expect(typeof extractLoginFormData).toBe('function');
	});

	it('should re-export performLogin', () => {
		expect(typeof performLogin).toBe('function');
	});
});
