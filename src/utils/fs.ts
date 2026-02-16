import { access, constants } from 'fs/promises';

export async function checkDirectory(
	dir: string,
): Promise<{ exists: boolean; writable: boolean }> {
	try {
		await access(dir, constants.F_OK);
	} catch {
		return { exists: false, writable: false };
	}

	try {
		await access(dir, constants.W_OK);
		return { exists: true, writable: true };
	} catch {
		return { exists: true, writable: false };
	}
}
