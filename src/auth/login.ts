import type { AxiosInstance } from 'axios';
import { parseHTML } from 'linkedom';
import type { LoginFormData } from '../types/index.js';

const SIGNIN_URL = 'https://www.geocaching.com/account/signin';

export async function extractLoginFormData(
	client: AxiosInstance,
): Promise<LoginFormData> {
	try {
		const response = await client.get(SIGNIN_URL);
		const { document } = parseHTML(response.data);

		const form = document.getElementById('SignupSignin');
		if (!form) {
			throw new Error('Login form not found on page');
		}

		const tokenInput = form.querySelector(
			'input[name="__RequestVerificationToken"]',
		) as HTMLInputElement | null;
		const returnUrlInput = form.querySelector(
			'input[name="ReturnUrl"]',
		) as HTMLInputElement | null;

		if (!tokenInput?.value) {
			throw new Error('Request verification token not found');
		}

		return {
			requestVerificationToken: tokenInput.value,
			returnUrl: returnUrlInput?.value || '/',
		};
	} catch (error) {
		throw error;
	}
}

export async function performLogin(
	client: AxiosInstance,
	username: string,
	password: string,
	formData: LoginFormData,
): Promise<boolean> {
	try {
		const params = new URLSearchParams();
		params.append('UsernameOrEmail', username);
		params.append('Password', password);
		params.append(
			'__RequestVerificationToken',
			formData.requestVerificationToken,
		);
		params.append('ReturnUrl', formData.returnUrl);

		const response = await client.post(SIGNIN_URL, params.toString(), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Referer: SIGNIN_URL,
			},
		});

		// Successful login should result in a 302 redirect
		return response.status === 302;
	} catch (error) {
		return false;
	}
}
