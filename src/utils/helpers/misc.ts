/**
 * Formats a timestamp into a human-readable "time ago" string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string like "2 hours ago" or "3 days ago"
 */
export function formatTimeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
	const weeks = Math.floor(days / 7);
	if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
	const months = Math.floor(days / 30); // Approximate
	if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
	const years = Math.floor(days / 365); // Approximate
	return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Formats a timestamp into a human-readable date string
 * @param timestamp - Unix timestamp in milliseconds
 * @param format - The format to use for the date
 * @param options - Additional formatting options
 * @returns Formatted date string
 */
export function formatTimestamp(
	timestamp: number,
	format: 'full' | 'long' | 'medium' | 'short' | 'relative' = 'medium',
	options: {
		includeTime?: boolean;
		timeZone?: string;
		locale?: string;
	} = {},
): string {
	const { includeTime = false, timeZone = 'UTC', locale = 'en-US' } = options;

	const date = new Date(timestamp);

	// Handle relative format (time ago)
	if (format === 'relative') {
		return formatTimeAgo(timestamp);
	}

	// Define date formatting options based on format
	const dateOptions: Intl.DateTimeFormatOptions = {
		timeZone,
		...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
	};

	switch (format) {
		case 'full':
			dateOptions.dateStyle = 'full';
			break;
		case 'long':
			dateOptions.dateStyle = 'long';
			break;
		case 'medium':
			dateOptions.dateStyle = 'medium';
			break;
		case 'short':
			dateOptions.dateStyle = 'short';
			break;
	}

	try {
		return new Intl.DateTimeFormat(locale, dateOptions).format(date);
	} catch (error) {
		console.error('Error formatting date:', error);
		// Fallback to basic formatting
		return date.toLocaleString(locale, {
			timeZone,
			...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
		});
	}
}
