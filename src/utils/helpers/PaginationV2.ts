import type { EmbedBuilder, CommandInteraction, Message } from 'discord.js';

/**
 * Settings for the pagination v2
 * this is the same as the PaginationSettings type but for the v2 display component
 * so we can use the same settings for both v1 and v2
 * will make pagination use v2 in the future
 * will meurge in  src/utils/helpers/Pagination.ts
 * will remove this file in the future
 */
export type PaginationV2Settings = {
	labels?: {
		first?: string;
		prev?: string;
		next?: string;
		last?: string;
		stop?: string;
	};
	buttonEmojis?: {
		first?: string;
		prev?: string;
		next?: string;
		last?: string;
		stop?: string;
	};
	placeholder?: string;
	time?: number;
	accentColor?: number;
	ephemeral?: boolean;
};

/**
 * Get the v2 display component builders
 * will make pagination use v2 in the future
 * will remove this function in the future
 * @
 */
function getV2Builders() {
	// Dynamic access to avoid hard dependency during compilation
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const djs = require('discord.js');
	const TextDisplayBuilder = djs?.TextDisplayBuilder;
	const SectionBuilder = djs?.SectionBuilder;
	const ContainerBuilder = djs?.ContainerBuilder;
	const ButtonBuilder = djs?.ButtonBuilder;
	const ButtonStyle = djs?.ButtonStyle;
	const ActionRowBuilder = djs?.ActionRowBuilder;
	const MessageFlags = djs?.MessageFlags;
	const ComponentType = djs?.ComponentType;
	if (
		!TextDisplayBuilder ||
		!SectionBuilder ||
		!ContainerBuilder ||
		!ButtonBuilder ||
		!ButtonStyle ||
		!ActionRowBuilder ||
		!MessageFlags ||
		!ComponentType
	) {
		throw new Error(
			'Display Components V2 are not available in this discord.js version',
		);
	}
	return {
		TextDisplayBuilder,
		SectionBuilder,
		ContainerBuilder,
		ButtonBuilder,
		ButtonStyle,
		ActionRowBuilder,
		MessageFlags,
		ComponentType,
	};
}

function createIds() {
	const base = `pg2_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
	return {
		first: `${base}_first`,
		prev: `${base}_prev`,
		next: `${base}_next`,
		last: `${base}_last`,
		stop: `${base}_stop`,
	};
}

export async function createPaginationV2(
	interaction: CommandInteraction,
	pages: EmbedBuilder[],
	settings: PaginationV2Settings = {},
): Promise<void> {
	const {
		TextDisplayBuilder,
		SectionBuilder,
		ContainerBuilder,
		ButtonBuilder,
		ButtonStyle,
		ActionRowBuilder,
		MessageFlags,
		ComponentType,
	} = getV2Builders();

	if (!pages?.length) return;

	let current = 0;
	const ids = createIds();

	const buildBody = (): any[] => {
		const text = new TextDisplayBuilder().setContent(
			(pages[current].data?.description as string) || '\u200b',
		);

		const section = new SectionBuilder().addTextDisplayComponents(() => text);

		const container = new ContainerBuilder()
			.setAccentColor(settings.accentColor ?? 0x0099ff)
			.addSectionComponents(() => section);

		return [container];
	};

	const buildControls = (): any[] => {
		const first = settings.buttonEmojis?.first
			? new ButtonBuilder()
					.setCustomId(ids.first)
					.setStyle(ButtonStyle.Primary)
					.setEmoji(settings.buttonEmojis.first)
					.setDisabled(current === 0)
			: null;

		const prev = new ButtonBuilder()
			.setCustomId(ids.prev)
			.setStyle(ButtonStyle.Primary)
			.setEmoji(settings.buttonEmojis?.prev ?? '⬅️')
			.setDisabled(current === 0);

		const stop = settings.buttonEmojis?.stop
			? new ButtonBuilder()
					.setCustomId(ids.stop)
					.setStyle(ButtonStyle.Danger)
					.setEmoji(settings.buttonEmojis.stop)
			: null;

		const next = new ButtonBuilder()
			.setCustomId(ids.next)
			.setStyle(ButtonStyle.Primary)
			.setEmoji(settings.buttonEmojis?.next ?? '➡️')
			.setDisabled(current === pages.length - 1);

		const last = settings.buttonEmojis?.last
			? new ButtonBuilder()
					.setCustomId(ids.last)
					.setStyle(ButtonStyle.Primary)
					.setEmoji(settings.buttonEmojis.last)
					.setDisabled(current === pages.length - 1)
			: null;

		const row = new ActionRowBuilder().setComponents(
			...([first, prev, stop, next, last].filter(Boolean) as any[]),
		);
		return [row];
	};

	let message: Message;
	message = await interaction.reply({
		components: [...buildBody(), ...buildControls()],
		flags: settings.ephemeral
			? [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
			: [MessageFlags.IsComponentsV2],
		fetchReply: true,
	});

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: settings.time ?? 5 * 60 * 1000,
		filter: (i) => i.user.id === interaction.user.id,
	});

	collector.on('collect', async (i) => {
		try {
			switch (i.customId) {
				case ids.first:
					current = 0;
					break;
				case ids.prev:
					current = Math.max(0, current - 1);
					break;
				case ids.next:
					current = Math.min(pages.length - 1, current + 1);
					break;
				case ids.last:
					current = pages.length - 1;
					break;
				case ids.stop:
					collector.stop('user');
					await i.deferUpdate();
					return;
			}
			await i.update({ components: [...buildBody(), ...buildControls()] });
		} catch (err) {
			if (!i.deferred && !i.replied) {
				await i.reply({
					content: 'Failed to update view',
					flags: [MessageFlags.Ephemeral],
				});
			}
		}
	});

	collector.on('end', async () => {
		try {
			await message.edit({ components: [...buildBody()] });
		} catch {}
	});
}
