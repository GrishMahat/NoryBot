import axios from 'axios';
import { type Client, EmbedBuilder } from 'discord.js';
import HypixelSkyBlockConfig, {
	type IApiKeyEntry,
	type IHypixelSkyBlockConfig,
} from '@/database/schemas/hypixelSkyBlockSchema';
import HypixelTracker from '@/database/schemas/hypixelTrackerSchema';
import { logs } from '@/services/logs';

const HYPIXEL_STATUS_ENDPOINT = 'https://api.hypixel.net/status';
const POLL_INTERVAL_MS = 60_000;

type HypixelStatusResponse = {
	success: boolean;
	cause?: string;
	session?: {
		online: boolean;
		gameType?: string;
	};
};

export class HypixelTrackerService {
	private static instance: HypixelTrackerService;
	private timer: NodeJS.Timeout | null = null;
	private isPolling = false;

	public static getInstance(): HypixelTrackerService {
		if (!HypixelTrackerService.instance) {
			HypixelTrackerService.instance = new HypixelTrackerService();
		}
		return HypixelTrackerService.instance;
	}

	public start(client: Client): void {
		if (this.timer) return;
		logs.info('Hypixel tracker service started', { tag: 'HypixelTracker' });
		this.poll(client).catch((error) => {
			logs.error(error, { tag: 'HypixelTracker', source: 'poll' });
		});
		this.timer = setInterval(() => {
			this.poll(client).catch((error) => {
				logs.error(error, { tag: 'HypixelTracker', source: 'poll' });
			});
		}, POLL_INTERVAL_MS);
	}

	public stop(): void {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
	}

	private async poll(client: Client): Promise<void> {
		if (this.isPolling) return;
		this.isPolling = true;

		try {
			const trackers = await HypixelTracker.find({ status: 'active' }).lean();
			if (!trackers.length) {
				logs.debug('No active trackers found', { tag: 'HypixelTracker' });
				return;
			}

			const guildIds = [...new Set(trackers.map((tracker) => tracker.guildID))];
			const configs = await HypixelSkyBlockConfig.find({ guildID: { $in: guildIds } });
			const configMap = new Map(configs.map((config) => [config.guildID, config]));

			for (const tracker of trackers) {
				const config = configMap.get(tracker.guildID);
				if (!config || !config.trackingEnabled || config.apiKeys.length === 0) {
					continue;
				}

				const keyEntry = this.getActiveKeyEntry(config);
				if (!keyEntry) continue;

				const now = new Date();
				const statusResponse = await this.fetchStatus(keyEntry.key, tracker.playerUuid);

				config.lastRequestAt = now;
				config.lastTrackedAt = now;
				config.lastTrackedPlayerUuid = tracker.playerUuid;
				keyEntry.lastUsedAt = now;
				config.lastUsedApiKey = keyEntry.key;
				config.lastUsedAt = now;

				if (!statusResponse.success) {
					if (statusResponse.cause?.toLowerCase().includes('invalid')) {
						keyEntry.status = 'expired';
						keyEntry.expiredAt = now;
					}
					await config.save();
					await HypixelTracker.updateOne(
						{ _id: tracker._id },
						{
							lastRequestAt: now,
							lastTrackedAt: now,
							lastError: statusResponse.cause ?? 'Unknown error',
						},
					);
					continue;
				}

				const online = statusResponse.session?.online ?? false;
				const newStatus = online ? 'online' : 'offline';
				const shouldNotify =
					tracker.lastOnlineStatus && tracker.lastOnlineStatus !== 'unknown'
						? tracker.lastOnlineStatus !== newStatus
						: false;

				if (shouldNotify) {
					await this.sendStatusMessage(
						client,
						tracker.channelId,
						tracker.trackedByUserId,
						tracker,
						newStatus,
					);
				}

				await Promise.all([
					config.save(),
					HypixelTracker.updateOne(
						{ _id: tracker._id },
						{
							lastTrackedAt: now,
							lastRequestAt: now,
							lastOnlineStatus: newStatus,
							lastStatusChangedAt: shouldNotify ? now : tracker.lastStatusChangedAt,
							lastError: undefined,
						},
					),
				]);
			}
		} finally {
			this.isPolling = false;
		}
	}

	private getActiveKeyEntry(config: IHypixelSkyBlockConfig): IApiKeyEntry | null {
		const entries = config.apiKeys as IApiKeyEntry[];
		const lastUsed = config.lastUsedApiKey
			? entries.find((entry: IApiKeyEntry) => entry.key === config.lastUsedApiKey)
			: undefined;

		if (lastUsed && lastUsed.status === 'active' && !lastUsed.disabled) {
			return lastUsed;
		}

		return (
			entries.find((entry: IApiKeyEntry) => entry.status === 'active' && !entry.disabled) ?? null
		);
	}

	private async fetchStatus(key: string, uuid: string): Promise<HypixelStatusResponse> {
		try {
			const response = await axios.get<HypixelStatusResponse>(HYPIXEL_STATUS_ENDPOINT, {
				params: { uuid },
				headers: { 'API-Key': key },
				timeout: 15000,
				validateStatus: () => true,
			});

			if (response.data?.success === true) {
				return response.data;
			}

			return {
				success: false,
				cause: response.data?.cause ?? `HTTP ${response.status}`,
			};
		} catch (error) {
			return {
				success: false,
				cause: error instanceof Error ? error.message : 'Request failed',
			};
		}
	}

	private async sendStatusMessage(
		client: Client,
		channelId: string,
		userId: string,
		tracker: { playerName?: string; playerUuid: string },
		status: 'online' | 'offline',
	): Promise<void> {
		const channel = (await client.channels.fetch(channelId).catch(() => null)) as {
			isTextBased?: () => boolean;
			send?: (options: { content?: string; embeds?: EmbedBuilder[] }) => Promise<unknown>;
		} | null;
		if (!channel || !channel.isTextBased?.() || !channel.send) {
			logs.warn('Tracking channel missing or not text-based', {
				tag: 'HypixelTracker',
				ids: { channelId },
			});
			return;
		}

		const name = tracker.playerName ?? tracker.playerUuid;
		const imageUrl = `https://visage.surgeplay.com/full/${tracker.playerUuid}`;
		const color = status === 'online' ? 0x57f287 : 0xed4245;

		const embed = new EmbedBuilder()
			.setTitle(`${name} is now ${status}`)
			.setColor(color)
			.setImage(imageUrl)
			.setTimestamp();

		const sendChannel = channel as unknown as {
			send: (options: { content?: string; embeds?: EmbedBuilder[] }) => Promise<unknown>;
		};
		await sendChannel.send({ content: `<@${userId}>`, embeds: [embed] });
	}
}
