import { type Document, model, Schema } from 'mongoose';

export type TrackingStatus = 'active' | 'paused' | 'error';
export type OnlineStatus = 'online' | 'offline' | 'unknown';

export interface IHypixelTracker extends Document {
	guildID: string;
	playerUuid: string;
	playerName?: string;
	profileId?: string;
	trackedByUserId: string;
	channelId: string;
	startedAt: Date;
	lastTrackedAt?: Date;
	lastRequestAt?: Date;
	lastOnlineStatus?: OnlineStatus;
	lastStatusChangedAt?: Date;
	status: TrackingStatus;
	lastError?: string;
	lastApiIssueNotifiedAt?: Date;
}

const hypixelTrackerSchema = new Schema<IHypixelTracker>(
	{
		guildID: { type: String, required: true },
		playerUuid: { type: String, required: true },
		playerName: { type: String, required: false },
		profileId: { type: String, required: false },
		trackedByUserId: { type: String, required: true },
		channelId: { type: String, required: true },
		startedAt: { type: Date, default: Date.now },
		lastTrackedAt: { type: Date, required: false },
		lastRequestAt: { type: Date, required: false },
		lastOnlineStatus: {
			type: String,
			enum: ['online', 'offline', 'unknown'],
			default: 'unknown',
		},
		lastStatusChangedAt: { type: Date, required: false },
		status: {
			type: String,
			enum: ['active', 'paused', 'error'],
			default: 'active',
		},
		lastError: { type: String, required: false },
		lastApiIssueNotifiedAt: { type: Date, required: false },
	},
	{
		strict: true,
		timestamps: true,
	},
);

hypixelTrackerSchema.index({ guildID: 1, playerUuid: 1, trackedByUserId: 1 }, { unique: true });

export default model<IHypixelTracker>('HypixelTracker', hypixelTrackerSchema);
