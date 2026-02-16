import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import type { SessionData } from '../types/index.js';

function getConfigDir(): string {
	const home = homedir();
	const plat = platform();

	switch (plat) {
		case 'win32':
			// Windows: %APPDATA%\jsmuggle
			return join(process.env.APPDATA || home, 'jsmuggle');
		case 'darwin':
			// macOS: ~/Library/Application Support/jsmuggle
			return join(home, 'Library', 'Application Support', 'jsmuggle');
		default:
			// Linux and others: ~/.local/share/jsmuggle
			return join(home, '.local', 'share', 'jsmuggle');
	}
}

const CONFIG_DIR = getConfigDir();
const SESSION_FILE = join(CONFIG_DIR, 'session.json');

export async function ensureConfigDir(): Promise<void> {
	if (!existsSync(CONFIG_DIR)) {
		await mkdir(CONFIG_DIR, { recursive: true });
	}
}

export function getSessionFilePath(): string {
	return SESSION_FILE;
}

export function getConfigDirPath(): string {
	return CONFIG_DIR;
}
