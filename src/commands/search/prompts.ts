import { text, multiselect } from '@clack/prompts';
import type { SearchResult } from '../../types/index.js';

export async function promptForSearchTerm(): Promise<string | symbol> {
	const result = await text({
		message: 'Enter search term (GC code, coordinates, or keyword):',
		placeholder: 'e.g., GC13Y2Y or "40.446, -79.949" or Seattle',
		validate: (value) => {
			if (!value || !value.trim()) {
				return 'Please enter a search term';
			}
		},
	});

	return result;
}

export async function promptCacheSelection(
	results: SearchResult[],
): Promise<string[]> {
	if (results.length === 0) {
		return [];
	}

	const options = results.map((result) => {
		const premiumMark = result.premiumOnly ? ' [P]' : '';
		return {
			value: result.code,
			label: `${result.code}${premiumMark} ${result.name} (${result.distance})`,
			hint: result.premiumOnly ? 'Premium Member Only' : undefined,
		};
	});

	const selected = await multiselect({
		message:
			'Select caches to download (use space to select, enter to confirm):',
		options,
		required: false,
	});

	if (typeof selected === 'symbol') {
		return [];
	}

	return selected as string[];
}
