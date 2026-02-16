import * as p from '@clack/prompts';

export async function promptOverwrite(gcCode: string): Promise<boolean> {
	const overwrite = await p.confirm({
		message: `File ${gcCode}.gpx already exists. Overwrite?`,
		initialValue: false,
	});

	if (p.isCancel(overwrite)) {
		return false;
	}

	return overwrite;
}
