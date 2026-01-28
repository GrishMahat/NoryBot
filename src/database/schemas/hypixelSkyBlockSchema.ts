import { randomUUID } from 'crypto';
import { type Document, model, Schema } from 'mongoose';

export type ApiKeyStatus = 'active' | 'expired' | 'disabled';

export interface IApiKeyEntry {
	id?: string;
	key: string;
	label?: string;
	addedBy?: string;
	addedAt?: Date;
	lastUsedAt?: Date;
	status?: ApiKeyStatus;
	expiredAt?: Date;
	disabled?: boolean;
}

export interface IHypixelSkyBlockConfig extends Document {
	guildID: string;
	apiKeys: IApiKeyEntry[];
	lastUsedApiKey: string | null;
	lastUsedAt?: Date;
	trackingEnabled: boolean;
	lastTrackedAt?: Date;
	lastTrackedProfileId?: string;
	lastTrackedPlayerUuid?: string;
	lastRequestAt?: Date;
}

const apiKeyEntrySchema = new Schema<IApiKeyEntry>(
	{
		id: { type: String, default: () => randomUUID() },
		key: { type: String, required: true },
		label: { type: String, required: false },
		addedBy: { type: String, required: false },
		addedAt: { type: Date, required: false },
		lastUsedAt: { type: Date, required: false },
		status: {
			type: String,
			enum: ['active', 'expired', 'disabled'],
			default: 'active',
		},
		expiredAt: { type: Date, required: false },
		disabled: { type: Boolean, default: false },
	},
	{
		_id: false,
	},
);

const hypixelSkyBlockSchema = new Schema<IHypixelSkyBlockConfig>(
	{
		guildID: { type: String, required: true },
		apiKeys: { type: [apiKeyEntrySchema], default: [] },
		lastUsedApiKey: { type: String, default: null },
		lastUsedAt: { type: Date, required: false },
		trackingEnabled: { type: Boolean, default: true },
		lastTrackedAt: { type: Date, required: false },
		lastTrackedProfileId: { type: String, required: false },
		lastTrackedPlayerUuid: { type: String, required: false },
		lastRequestAt: { type: Date, required: false },
	},
	{
		strict: true,
		timestamps: true,
	},
);

hypixelSkyBlockSchema.index({ guildID: 1 }, { unique: true });

export default model<IHypixelSkyBlockConfig>('HypixelSkyBlockConfig', hypixelSkyBlockSchema);
