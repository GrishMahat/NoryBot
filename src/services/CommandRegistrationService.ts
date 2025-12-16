import 'colors';
import {
	type ApplicationCommand,
	type ApplicationCommandOptionData,
	ApplicationCommandType,
	type Client,
	type ContextMenuCommandBuilder,
	DiscordAPIError,
	type PermissionResolvable,
	PermissionsBitField,
} from 'discord.js';
import { logs } from '@/services/logs';
import type { Command, LocalContextMenu } from '@/types/index';
import { hashCommand } from '@/utils/helpers/commandHasher';
import getApplicationCommands from '@/utils/helpers/getApplicationCommands';
import getCommands from '@/utils/helpers/getLocalCommands';
import getLocalContextMenus from '@/utils/helpers/getLocalContextMenus';

export class CommandRegistrationService {
	private readonly client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	public async synchronize(): Promise<void> {
		try {
			const [Commands, localContextMenus, applicationCommands] = await Promise.all([
				getCommands(),
				getLocalContextMenus(),
				getApplicationCommands(this.client),
			]);

			if (!Commands || !localContextMenus || !applicationCommands) {
				throw new Error('Failed to fetch commands or context menus');
			}

			const commandChanges = await this.processApplicationCommands(Commands, applicationCommands);
			await this.processContextMenus(localContextMenus, applicationCommands);

			logs.info(
				`Command Sync: ${commandChanges.updated.length} updated, ${commandChanges.new.length} new, ${commandChanges.deleted.length} deleted.`,
				{ tag: 'CommandRegistration' },
			);
		} catch (err: unknown) {
			logs.error(err, { tag: 'CommandRegistration', context: 'synchronize' });
		}
	}

	private async processApplicationCommands(
		Commands: Command[],
		applicationCommands: ApplicationCommand[],
	): Promise<{ updated: string[]; new: string[]; deleted: string[] }> {
		const updated: string[] = [];
		const newCmds: string[] = [];
		const deleted: string[] = [];

		// 1. Delete Obsolete
		const validCommandNames = new Set(
			Commands.filter((cmd) => !cmd.deleted)
				.map((cmd) => cmd.data?.name)
				.filter(Boolean),
		);

		const commandsToDelete = applicationCommands.filter(
			(cmd) =>
				cmd.type === ApplicationCommandType.ChatInput &&
				cmd.name &&
				!validCommandNames.has(cmd.name),
		);

		await Promise.all(
			commandsToDelete.map(async (cmd) => {
				try {
					await cmd.delete();
					deleted.push(cmd.name);
				} catch (err) {
					if (err instanceof DiscordAPIError && err.code === 50035) {
						logs.warn(
							`Could not delete command '${cmd.name}': Discord API validation failed (likely invalid Redirect URIs).`,
							{ tag: 'CommandRegistration' },
						);
					} else {
						logs.error(err, { tag: 'CommandRegistration', context: `deleteCommand:${cmd.name}` });
					}
				}
			}),
		);

		// 2. Update or Create
		const validCommands = Commands.filter((cmd) => cmd?.data?.name && cmd.deleted !== true);
		const existingCommandsMap = new Map(applicationCommands.map((cmd) => [cmd.name, cmd]));

		await Promise.all(
			validCommands.map(async (Command) => {
				const { data } = Command;
				const commandName = data.name;
				const existingCommand = existingCommandsMap.get(commandName);

				if (existingCommand) {
					// Check if it's the right type (ChatInput)
					if (existingCommand.type === ApplicationCommandType.ChatInput) {
						if (await this.handleExistingCommand(existingCommand, Command)) {
							updated.push(commandName);
						}
					}
				} else {
					await this.createCommand(data);
					newCmds.push(commandName);
				}
			}),
		);

		return { updated, new: newCmds, deleted };
	}

	private async processContextMenus(
		localContextMenus: LocalContextMenu[],
		applicationCommands: ApplicationCommand[],
	): Promise<{ updated: string[]; new: string[]; deleted: string[] }> {
		const updated: string[] = [];
		const newMenus: string[] = [];
		const deleted: string[] = [];

		// 1. Delete Obsolete
		const localContextMenuNames = new Set(
			localContextMenus.map((menu) => menu.data?.name).filter(Boolean),
		);
		const contextMenusToDelete = applicationCommands.filter(
			(cmd) =>
				(cmd.type === ApplicationCommandType.User || cmd.type === ApplicationCommandType.Message) &&
				cmd.name &&
				!localContextMenuNames.has(cmd.name),
		);

		await Promise.all(
			contextMenusToDelete.map(async (cmd) => {
				try {
					await cmd.delete();
					deleted.push(cmd.name);
				} catch (err) {
					logs.error(err, { tag: 'CommandRegistration', context: `deleteContextMenu:${cmd.name}` });
				}
			}),
		);

		// 2. Update or Create
		for (const localContextMenu of localContextMenus) {
			if (!localContextMenu?.data?.name) continue;

			const { data } = localContextMenu;
			const contextMenuName = data.name;

			const existingContextMenu = applicationCommands.find(
				(cmd) =>
					cmd.name === contextMenuName &&
					(cmd.type === ApplicationCommandType.User || cmd.type === ApplicationCommandType.Message),
			);

			if (existingContextMenu) {
				if (await this.handleExistingContextMenu(existingContextMenu, localContextMenu)) {
					updated.push(contextMenuName);
				}
			} else {
				await this.createContextMenu(data);
				newMenus.push(contextMenuName);
			}
		}

		return { updated, new: newMenus, deleted };
	}

	private async handleExistingCommand(
		existingCommand: ApplicationCommand,
		Command: Command,
	): Promise<boolean> {
		const localHash = hashCommand(Command);
		const existingHash = hashCommand(existingCommand);

		if (localHash !== existingHash) {
			logs.debug(`Hash mismatch for command ${Command.data.name}`, { tag: 'CommandRegistration' });

			try {
				const commandData = Command.data.toJSON();
				const defaultMemberPermissions = commandData.default_member_permissions
					? new PermissionsBitField(commandData.default_member_permissions as PermissionResolvable)
					: null;

				await existingCommand.edit({
					name: commandData.name,
					description: commandData.description ?? '',
					contexts: commandData.contexts,
					integrationTypes: commandData.integration_types,
					options: (commandData.options as ApplicationCommandOptionData[]) ?? [],
					dmPermission: commandData.dm_permission ?? true,
					defaultMemberPermissions,
				});
				return true;
			} catch (error) {
				logs.error(error, {
					tag: 'CommandRegistration',
					context: `updateCommand:${Command.data.name}`,
				});
			}
		}
		return false;
	}

	private async createCommand(data: Command['data']): Promise<void> {
		try {
			const commandData = data.toJSON();
			const defaultMemberPermissions = commandData.default_member_permissions
				? new PermissionsBitField(commandData.default_member_permissions as PermissionResolvable)
				: null;

			await this.client.application?.commands.create({
				name: commandData.name,
				description: commandData.description ?? '',
				contexts: commandData.contexts,
				integrationTypes: commandData.integration_types,
				options: (commandData.options as ApplicationCommandOptionData[]) ?? [],
				dmPermission: commandData.dm_permission ?? true,
				defaultMemberPermissions,
			});
		} catch (err) {
			logs.error(err, { tag: 'CommandRegistration', context: `createCommand:${data.name}` });
		}
	}

	private async handleExistingContextMenu(
		existingContextMenu: ApplicationCommand,
		localContextMenu: LocalContextMenu,
	): Promise<boolean> {
		const localHash = hashCommand(localContextMenu);
		const existingHash = hashCommand(existingContextMenu);

		if (localHash !== existingHash) {
			logs.debug(`Hash mismatch for context menu ${localContextMenu.data.name}`, {
				tag: 'CommandRegistration',
			});

			try {
				await existingContextMenu.edit(localContextMenu.data);
				return true;
			} catch (error) {
				logs.error(error, {
					tag: 'CommandRegistration',
					context: `updateContextMenu:${localContextMenu.data.name}`,
				});
			}
		}
		return false;
	}

	private async createContextMenu(data: ContextMenuCommandBuilder): Promise<void> {
		try {
			await this.client.application?.commands.create(data);
		} catch (err) {
			logs.error(err, { tag: 'CommandRegistration', context: `createContextMenu:${data.name}` });
		}
	}
}
