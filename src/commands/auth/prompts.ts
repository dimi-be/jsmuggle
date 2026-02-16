import * as p from '@clack/prompts';

export async function promptCredentials(): Promise<{
	username: string;
	password: string;
}> {
	const username = await p.text({
		message: 'Enter your username or email:',
		validate: (value) => {
			if (!value) return 'Username is required';
		},
	});

	if (p.isCancel(username)) {
		process.exit(0);
	}

	const password = await p.password({
		message: 'Enter your password:',
		validate: (value) => {
			if (!value) return 'Password is required';
		},
	});

	if (p.isCancel(password)) {
		process.exit(0);
	}

	return { username: username as string, password: password as string };
}
