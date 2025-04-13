/**
 * The configuration object for the bot.
 * @type {Object}
 */
export const config = {
	/**
	 * @type {boolean}
	 */
	errorHandler: true,
	/**
	 * The ID of the test server.
	 * @type {string}
	 */
	testServerId: '1207374906296246282',
	/**
	 * The IDs of the developers.
	 * @type {string[]}
	 */
	developersId: [
		'660117771421614085',
		'598554287244574731',
		'1215648186643906643',
	],
	/**
	 * The duration to cache data in seconds.
	 * @type {number}
	 */
	cacheDuration: 300,
	/**
	 * Whether the bot is in maintenance mode.
	 * @type {boolean}
	 */
	maintenance: false,
};
