/**
 * @file Types related to music playback
 * @description Defines types for music player, tracks, and playback state
 */

import { VoiceChannel, Guild, GuildMember } from 'discord.js';

/**
 * Represents the current state of a track
 */
export type TrackState =
  | 'playing'
  | 'paused'
  | 'stopped'
  | 'buffering'
  | 'error';

/**
 * Represents a music track's metadata
 */
export interface TrackMetadata {
  /** The title of the track */
  title: string;
  /** The artist/creator of the track */
  artist: string;
  /** Optional album name */
  album?: string;
  /** URL to the track's thumbnail/artwork */
  thumbnail?: string;
  /** Duration in seconds */
  duration: number;
  /** Original URL of the track */
  url: string;
  /** Whether the track is a livestream */
  isLive?: boolean;
}

/**
 * Represents a track in the queue
 */
export interface QueuedTrack extends TrackMetadata {
  /** Member who requested the track */
  requestedBy: GuildMember;
  /** When the track was added to queue */
  addedAt: Date;
  /** Track position in queue (0-based) */
  position: number;
}

/**
 * Represents the current playback progress
 */
export interface PlaybackProgress {
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration in seconds */
  totalTime: number;
  /** Current state of the track */
  state: TrackState;
  /** Current volume (0-100) */
  volume: number;
  /** Whether track is set to loop */
  loop: boolean;
}

/**
 * Represents a guild's music player state
 */
export interface GuildMusicState {
  /** The voice channel the bot is connected to */
  voiceChannel: VoiceChannel;
  /** The guild this state belongs to */
  guild: Guild;
  /** Currently playing track */
  currentTrack: QueuedTrack | null;
  /** Queue of upcoming tracks */
  queue: QueuedTrack[];
  /** Current playback progress */
  progress: PlaybackProgress;
  /** Whether the queue is set to loop */
  queueLoop: boolean;
  /** Whether the player is in shuffle mode */
  shuffle: boolean;
  /** Last time the player was active */
  lastActive: Date;
}

/**
 * Options for music player visualization
 */
export interface MusicVisualizerOptions {
  /** Background color or gradient */
  background?: {
    type: 'solid' | 'gradient';
    colors: string[];
    angle?: number;
  };
  /** Visualizer bar settings */
  bars?: {
    count: number;
    width: number;
    spacing: number;
    color: string;
    opacity: number;
  };
  /** Progress bar settings */
  progressBar?: {
    height: number;
    backgroundColor: string;
    foregroundColor: string;
    borderRadius?: number;
  };
  /** Text settings */
  text?: {
    titleColor: string;
    artistColor: string;
    timeColor: string;
    titleSize: number;
    artistSize: number;
    timeSize: number;
    font: string;
  };
  /** Control button settings */
  controls?: {
    size: number;
    color: string;
    activeColor: string;
    glowColor: string;
    glowStrength: number;
  };
}

/**
 * Available music commands
 */
export type MusicCommand =
  | 'play'
  | 'pause'
  | 'resume'
  | 'skip'
  | 'stop'
  | 'queue'
  | 'clear'
  | 'shuffle'
  | 'loop'
  | 'volume'
  | 'nowplaying'
  | 'remove'
  | 'move'
  | 'seek'
  | 'lyrics';

/**
 * Music command error types
 */
export type MusicErrorType =
  | 'NO_VOICE_CHANNEL'
  | 'NO_PERMISSIONS'
  | 'NOT_IN_SAME_CHANNEL'
  | 'NO_TRACK_PLAYING'
  | 'QUEUE_EMPTY'
  | 'TRACK_NOT_FOUND'
  | 'PLAYBACK_ERROR'
  | 'INVALID_ARGUMENT';
