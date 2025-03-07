/**
 * @file Types related to Reddit API responses
 * @description Defines types for Reddit API data structures and responses
 */

/**
 * Represents a single post/submission on Reddit
 */
export interface RedditPost {
	/** The type of object (always "t3" for posts) */
	kind: string;
	/** The actual post data */
	data: RedditPostData;
}

/**
 * Contains all the details of a Reddit post
 */
export interface RedditPostData {
	/** Post metadata */
	id: string;
	name: string;
	permalink: string;
	url: string;
	created_utc: number;

	/** Post content */
	title: string;
	selftext: string;
	thumbnail: string;

	/** Subreddit information */
	subreddit: string;
	subreddit_name_prefixed: string;

	/** Author information */
	author: string;
	author_fullname: string;

	/** Post statistics */
	score: number;
	ups: number;
	downs: number;
	num_comments: number;

	/** Post flags */
	stickied: boolean;
	saved: boolean;
	over_18: boolean;
	is_video: boolean;
	is_self: boolean;
	spoiler: boolean;
	pinned: boolean;
	locked: boolean;
	archived: boolean;
	approved_at_utc: number | null;

	/** Media content */
	media?: RedditMedia | null;
	media_metadata?: Record<string, RedditMediaMetadata>;
	gallery_data?: {
		items: Array<{
			media_id: string;
			id: number;
		}>;
	};
}

/**
 * Media content attached to a post (videos, embeds)
 */
export interface RedditMedia {
	/** For video posts */
	reddit_video?: {
		bitrate_kbps: number;
		fallback_url: string;
		height: number;
		width: number;
		scrubber_media_url: string;
		dash_url: string;
		duration: number;
		hls_url: string;
		is_gif: boolean;
		transcoding_status: string;
	};

	/** For embedded content (YouTube, Twitter, etc.) */
	oembed?: {
		provider_url: string;
		provider_name: string;
		title: string;
		type: string;
		html: string;
		thumbnail_url: string;
		thumbnail_width: number;
		height: number;
		width: number;
	};
}

/**
 * Metadata for gallery posts with multiple images
 */
export interface RedditMediaMetadata {
	status: string;
	e: string;
	m: string;
	/** Image previews in different resolutions */
	p: Array<{
		y: number; // height
		x: number; // width
		u: string; // url
	}>;
	/** Source image */
	s: {
		y: number; // height
		x: number; // width
		u: string; // url
	};
	id: string;
}

/**
 * The main response structure from Reddit's listing endpoints
 */
export interface RedditListing {
	kind: string;
	data: {
		/** Pagination token for the next page */
		after: string | null;
		/** Pagination token for the previous page */
		before: string | null;
		/** Array of posts in the listing */
		children: RedditPost[];
		/** Number of posts returned */
		dist: number;
		geo_filter: string;
		modhash: string;
	};
}

/** Available sort options for Reddit posts */
export type RedditSortOption = 'hot' | 'new' | 'top' | 'rising';

/** Time period filters for 'top' sorted posts */
export type RedditTimeOption = 'day' | 'week' | 'month' | 'year' | 'all';
