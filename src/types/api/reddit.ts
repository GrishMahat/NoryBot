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
	created: number;
	created_utc: number;
	distinguished?: string;
	subreddit_id: string;
	link_flair_background_color: string;
	is_robot_indexable: boolean;

	/** Post content */
	title: string;
	selftext: string;
	selftext_html: string | null;
	thumbnail: string;
	thumbnail_height: number | null;
	thumbnail_width: number | null;

	/** Subreddit information */
	subreddit: string;
	subreddit_name_prefixed: string;
	subreddit_type: string;
	subreddit_subscribers: number;

	/** Author information */
	author: string;
	author_fullname: string;
	author_premium: boolean;
	author_patreon_flair: boolean;
	author_is_blocked: boolean;
	author_flair_text: string | null;
	author_flair_text_color: string | null;
	author_flair_background_color: string | null;
	author_flair_type: string;
	author_flair_css_class: string | null;
	author_flair_richtext: unknown[];
	author_flair_template_id: string | null;

	/** Post statistics */
	score: number;
	ups: number;
	downs: number;
	upvote_ratio: number;
	num_comments: number;
	num_crossposts: number;
	total_awards_received: number;
	gilded: number;
	gildings: Record<string, unknown>;
	all_awardings: unknown[];
	awarders: unknown[];

	/** Post flags */
	stickied: boolean;
	saved: boolean;
	over_18: boolean;
	is_video: boolean;
	is_self: boolean;
	is_original_content: boolean;
	is_meta: boolean;
	is_crosspostable: boolean;
	spoiler: boolean;
	pinned: boolean;
	locked: boolean;
	archived: boolean;
	no_follow: boolean;
	send_replies: boolean;
	contest_mode: boolean;
	hidden: boolean;
	quarantine: boolean;
	can_gild: boolean;
	can_mod_post: boolean;
	approved_at_utc: number | null;

	/** Media content */
	media?: RedditMedia | null;
	media_embed: Record<string, unknown>;
	secure_media: RedditMedia | null;
	secure_media_embed: Record<string, unknown>;
	media_only: boolean;
	domain: string;

	/** Moderation fields */
	mod_reason_title: string | null;
	mod_reason_by: string | null;
	mod_note: string | null;
	removed_by: string | null;
	removed_by_category: string | null;
	banned_by: string | null;
	banned_at_utc: string | null;
	approved_by: string | null;
	num_reports: number | null;
	mod_reports: unknown[];
	user_reports: unknown[];
	treatment_tags: string[];
	report_reasons: string[] | null;

	/** Additional fields */
	pwls: number;
	wls: number;
	category: string | null;
	content_categories: string[] | null;
	discussion_type: string | null;
	view_count: number | null;
	suggested_sort: string | null;
	visited: boolean;
	clicked: boolean;
	likes: boolean | null;
	link_flair_text: string | null;
	link_flair_text_color: string;
	link_flair_type: string;
	link_flair_css_class: string | null;
	link_flair_richtext: unknown[];
	is_created_from_ads_ui: boolean;
	allow_live_comments: boolean;

	/** Gallery posts */
	is_gallery?: boolean;
	gallery_data?: {
		items: Array<{
			media_id: string;
			id: number;
		}>;
	};
	media_metadata?: Record<
		string,
		{
			status: string;
			e: string;
			m: string;
			p: Array<{ y: number; x: number; u: string }>;
			s: { y: number; x: number; u: string };
			id: string;
		}
	>;
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
