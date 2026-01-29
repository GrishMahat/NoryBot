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
const API_ISSUE_DEBOUNCE_MS = 15 * 60_000;

const formatDuration = (ms: number): string => {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const parts: string[] = [];

	if (days > 0) parts.push(`${days}d`);
	if (hours > 0 || days > 0) parts.push(`${hours}h`);
	parts.push(`${minutes}m`);

	return parts.join(' ');
};

type HypixelStatusResponse = {
	success: boolean;
	cause?: string;
	statusCode?: number;
	invalidKey?: boolean;
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
			const expiredNotifications = new Set<string>();

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
					const wasExpired = keyEntry.status === 'expired';
					const isInvalidKey = statusResponse.invalidKey === true;
					const errorDetails = statusResponse.cause ?? 'Unknown error';
					const lastNotifiedAt = tracker.lastApiIssueNotifiedAt
						? new Date(tracker.lastApiIssueNotifiedAt)
						: undefined;
					const shouldNotifyIssue =
						!lastNotifiedAt || now.getTime() - lastNotifiedAt.getTime() > API_ISSUE_DEBOUNCE_MS;

					if (isInvalidKey) {
						const nextCount = (keyEntry.invalidCount ?? 0) + 1;
						keyEntry.invalidCount = nextCount;
						keyEntry.lastInvalidAt = now;
						keyEntry.lastInvalidReason = errorDetails;

						if (nextCount >= 3) {
							keyEntry.status = 'expired';
							keyEntry.expiredAt = now;
						}
					}

					await config.save();
					await HypixelTracker.updateOne(
						{ _id: tracker._id },
						{
							lastRequestAt: now,
							lastTrackedAt: now,
							lastError: isInvalidKey
								? `Invalid API key (${keyEntry.invalidCount ?? 0}/3): ${errorDetails}`
								: errorDetails,
							lastApiIssueNotifiedAt: shouldNotifyIssue ? now : tracker.lastApiIssueNotifiedAt,
						},
					);

					const notifyKey = `${config.guildID}:${keyEntry.id ?? keyEntry.key}`;
					if (isInvalidKey && keyEntry.status === 'expired' && !wasExpired) {
						if (!expiredNotifications.has(notifyKey)) {
							expiredNotifications.add(notifyKey);
							await this.sendKeyExpiredMessage(client, tracker.channelId, keyEntry, errorDetails);
						}
					} else if (shouldNotifyIssue) {
						await this.sendApiIssueMessage(client, tracker.channelId, tracker, keyEntry, {
							reason: errorDetails,
							invalidKey: isInvalidKey,
							invalidCount: keyEntry.invalidCount ?? 0,
							lastCheckedAt: now,
						});
					}
					continue;
				}

				const online = statusResponse.session?.online ?? false;
				const newStatus = online ? 'online' : 'offline';
				const shouldNotify =
					tracker.lastOnlineStatus && tracker.lastOnlineStatus !== 'unknown'
						? tracker.lastOnlineStatus !== newStatus
						: false;

				if ((keyEntry.invalidCount ?? 0) > 0) {
					keyEntry.invalidCount = 0;
					keyEntry.lastInvalidAt = undefined;
					keyEntry.lastInvalidReason = undefined;
				}

				if (shouldNotify) {
					await this.sendStatusMessage(
						client,
						tracker.channelId,
						tracker.trackedByUserId,
						tracker,
						keyEntry,
						newStatus,
						{
							gameType: statusResponse.session?.gameType,
							previousStatus: tracker.lastOnlineStatus,
							lastCheckedAt: now,
						},
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
				return { ...response.data, statusCode: response.status, invalidKey: false };
			}

			const cause = response.data?.cause ?? `HTTP ${response.status}`;
			const invalidKey =
				response.status === 403 ||
				response.data?.cause?.toLowerCase().includes('invalid') ||
				response.data?.cause?.toLowerCase().includes('expired');

			return {
				success: false,
				cause,
				statusCode: response.status,
				invalidKey,
			};
		} catch (error) {
			return {
				success: false,
				cause: error instanceof Error ? error.message : 'Request failed',
				invalidKey: false,
			};
		}
	}

	private async sendKeyExpiredMessage(
		client: Client,
		channelId: string,
		keyEntry: IApiKeyEntry,
		reason: string,
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

		const masked = this.maskKey(keyEntry.key);
		const keyLabel = this.formatKeyLabel(keyEntry);
		const mention = keyEntry.addedBy ? `<@${keyEntry.addedBy}>` : '';
		const embed = new EmbedBuilder()
			.setTitle('Hypixel API key expired')
			.setColor(0xf1c40f)
			.setDescription(
				`${mention} The API key ${masked} was marked as expired after 3 invalid responses.`,
			)
			.addFields(
				{ name: 'Key', value: keyLabel, inline: false },
				{ name: 'Reason', value: reason || 'Invalid API key', inline: false },
				{
					name: 'Next Step',
					value: 'Use `/hypixel api-key set-active` or add a new key.',
					inline: false,
				},
			)
			.setTimestamp();

		const sendChannel = channel as unknown as {
			send: (options: { content?: string; embeds?: EmbedBuilder[] }) => Promise<unknown>;
		};
		await sendChannel.send({ embeds: [embed] });
	}

	private async sendStatusMessage(
		client: Client,
		channelId: string,
		userId: string,
		tracker: {
			playerName?: string;
			playerUuid: string;
			lastStatusChangedAt?: Date;
			startedAt?: Date;
			lastError?: string;
		},
		keyEntry: IApiKeyEntry,
		status: 'online' | 'offline',
		meta?: { gameType?: string; previousStatus?: string; lastCheckedAt?: Date },
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
		const thumbnailUrl = `https://visage.surgeplay.com/head/128/${tracker.playerUuid}`;
		const color = status === 'online' ? 0x57f287 : 0xed4245;
		const previousStatus = meta?.previousStatus ?? 'unknown';
		const gameType = meta?.gameType ?? (status === 'online' ? 'Unknown' : 'Offline');
		const profileUrl = `https://namemc.com/profile/${tracker.playerUuid}`;
		const changedAt = tracker.lastStatusChangedAt ?? tracker.startedAt ?? meta?.lastCheckedAt;
		const duration = changedAt ? formatDuration(Date.now() - changedAt.getTime()) : 'Unknown';
		const apiStatus = '✅ Data fresh';
		const statusChip = status === 'online' ? '🟢 Online' : '🔴 Offline';
		const statusLine =
			previousStatus === 'unknown'
				? `${statusChip} - Status is **${status}**`
				: `${statusChip} - Status changed from **${previousStatus}** -> **${status}**`;
		const sessionLines = [
			`Game: ${gameType || 'Unknown'}`,
			`Duration: ${duration}`,
			meta?.lastCheckedAt
				? `Last checked: <t:${Math.floor(meta.lastCheckedAt.getTime() / 1000)}:R>`
				: 'Last checked: Unknown',
		];
		const keyLabel = this.formatKeyLabel(keyEntry);

		const embed = new EmbedBuilder()
			.setTitle(`${name} is ${status}`)
			.setDescription(statusLine)
			.setColor(color)
			.setThumbnail(thumbnailUrl)
			.addFields(
				{ name: 'UUID', value: `\`${tracker.playerUuid}\``, inline: true },
				{ name: 'Profile', value: `[NameMC](${profileUrl})`, inline: true },
				{ name: 'Session', value: sessionLines.join('\n'), inline: false },
				{ name: 'API Health', value: apiStatus, inline: false },
			)
			.setFooter({ text: `Tracked by <@${userId}> • Key: ${keyLabel}` })
			.setTimestamp();

		const sendChannel = channel as unknown as {
			send: (options: { content?: string; embeds?: EmbedBuilder[] }) => Promise<unknown>;
		};
		await sendChannel.send({ content: `<@${userId}>`, embeds: [embed] });
	}

	private async sendApiIssueMessage(
		client: Client,
		channelId: string,
		tracker: {
			playerName?: string;
			playerUuid: string;
			trackedByUserId: string;
		},
		keyEntry: IApiKeyEntry,
		meta: { reason: string; invalidKey: boolean; invalidCount: number; lastCheckedAt: Date },
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
		const thumbnailUrl = `https://visage.surgeplay.com/head/128/${tracker.playerUuid}`;
		const apiStatus = meta.invalidKey
			? `⚠️ Invalid API key (${meta.invalidCount}/3)`
			: '⚠️ API issue';
		const keyLabel = this.formatKeyLabel(keyEntry);
		const embed = new EmbedBuilder()
			.setTitle(`API issue while tracking ${name}`)
			.setColor(0xf1c40f)
			.setThumbnail(thumbnailUrl)
			.setDescription(`${apiStatus} - ${meta.reason}`)
			.addFields(
				{
					name: 'Session',
					value: meta.lastCheckedAt
						? `Last checked: <t:${Math.floor(meta.lastCheckedAt.getTime() / 1000)}:R>`
						: 'Last checked: Unknown',
					inline: false,
				},
				{ name: 'API Health', value: apiStatus, inline: false },
				{
					name: 'Next Step',
					value: 'Use `/hypixel api-key set-active` or add a new key.',
					inline: false,
				},
			)
			.setFooter({ text: `Tracked by <@${tracker.trackedByUserId}> • Key: ${keyLabel}` })
			.setTimestamp();

		const sendChannel = channel as unknown as {
			send: (options: { content?: string; embeds?: EmbedBuilder[] }) => Promise<unknown>;
		};
		await sendChannel.send({ embeds: [embed] });
	}

	private formatKeyLabel(keyEntry: IApiKeyEntry): string {
		const masked = this.maskKey(keyEntry.key);
		return keyEntry.label ? `${keyEntry.label} (${masked})` : masked;
	}

	private maskKey(key: string): string {
		if (key.length <= 4) return `****${key}`;
		return `${'*'.repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`;
	}
}
