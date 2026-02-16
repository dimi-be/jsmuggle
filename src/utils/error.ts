/**
 * Error handling utilities for consistent error output
 */

export interface ErrorLogOptions {
	verbose?: boolean;
}

/**
 * Log an error with optional detailed output based on verbose mode
 * @param message - User-friendly error message
 * @param error - The error object (can be undefined)
 * @param options - Options including verbose flag
 */
export function logError(
	message: string,
	error: unknown,
	options?: ErrorLogOptions,
): void {
	console.error(message);

	if (options?.verbose && error) {
		if (error instanceof Error) {
			console.error('Error details:', error.message);
			if (error.stack) {
				console.error('Stack trace:', error.stack);
			}
		} else {
			console.error('Error details:', error);
		}
	}
}

/**
 * Format error message for display
 * @param error - The error to format
 * @param verbose - Whether to include full details
 * @returns Formatted error message
 */
export function formatErrorMessage(error: unknown, verbose?: boolean): string {
	if (!error) {
		return 'Unknown error';
	}

	if (error instanceof Error) {
		if (verbose && error.stack) {
			return `${error.message}\n${error.stack}`;
		}
		return error.message;
	}

	return String(error);
}
