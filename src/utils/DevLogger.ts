import 'colors';

/**
 * Utility for pretty console logging during development.
 * Uses the 'colors' package for styling.
 */
export class DevLogger {
	/**
	 * Log info message
	 */
	static info(title: string, message: string): void {
		console.log(`[${'INFO'.cyan}] ${title.bold}: ${message}`);
	}

	/**
	 * Log success message
	 */
	static success(title: string, message: string): void {
		console.log(`[${'SUCCESS'.green}] ${title.bold}: ${message}`);
	}

	/**
	 * Log warning message
	 */
	static warn(title: string, message: string): void {
		console.log(`[${'WARN'.yellow}] ${title.bold}: ${message}`);
	}

	/**
	 * Log error message
	 */
	static error(title: string, message: string): void {
		console.log(`[${'ERROR'.red}] ${title.bold}: ${message}`);
	}

	/**
	 * Display a styled box for important messages (like errors)
	 */
	static box(
		title: string,
		lines: string[],
		color: 'red' | 'yellow' | 'green' | 'blue' = 'blue',
	): void {
		const width = 60;
		const horizontal = '─'.repeat(width);
		const top = `┌${horizontal}┐`;
		const bottom = `└${horizontal}┘`;

		const c = (str: string) => str[color] as string;

		console.log(c(top));
		console.log(c(`│ ${title.padEnd(width - 1)}│`));
		console.log(c(`├${horizontal}┤`));

		for (const line of lines) {
			// Basic wrapping or truncation could be added here, currently just printing
			console.log(c(`│ ${line.padEnd(width - 1)}│`));
		}

		console.log(c(bottom));
	}

	/**
	 * Display a table of data
	 */
	static table(headers: string[], rows: string[][]): void {
		const colWidths = headers.map((h, i) => {
			const maxRow = Math.max(...rows.map((r) => (r[i] || '').length));
			return Math.max(h.length, maxRow) + 2;
		});

		const buildRow = (items: string[]) => {
			return items.map((item, i) => item.padEnd(colWidths[i])).join(' | ');
		};

		const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-');

		console.log(buildRow(headers).bold);
		console.log(separator.gray);

		for (const row of rows) {
			console.log(buildRow(row));
		}
		console.log('');
	}
}
