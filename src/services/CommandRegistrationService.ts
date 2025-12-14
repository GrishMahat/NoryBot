import 'colors';
import {
	type ApplicationCommand,
	type ApplicationCommandOptionData,
	ApplicationCommandType,
	type Client,
	type ContextMenuCommandBuilder,
	type PermissionResolvable,
	PermissionsBitField,
} from 'discord.js';
import type { Command, LocalContextMenu } from '@/types/index';
import getApplicationCommands from '@/utils/helpers/getApplicationCommands';
import getCommands from '@/utils/helpers/getLocalCommands';
import getLocalContextMenus from '@/utils/helpers/getLocalContextMenus';
import compareCommands from '@/utils/validators/commandComparing';
import compareContextMenus from '@/utils/validators/contextmenusComparing';

export class CommandRegistrationService {
	private readonly client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	public async synchronize(): Promise<void> {
		try {
			const fetchStartTime = process.hrtime.bigint();
			const [Commands, localContextMenus, applicationCommands] = await Promise.all([
				getCommands(),
				getLocalContextMenus(),
				getApplicationCommands(this.client),
			]);
			const fetchEndTime = process.hrtime.bigint();
			const fetchTime = Number(fetchEndTime - fetchStartTime) / 1_000_000;

			if (!Commands || !localContextMenus || !applicationCommands) {
				throw new Error('Failed to fetch commands or context menus');
			}

			const processStartTime = process.hrtime.bigint();

			const commandChanges = await this.processApplicationCommands(Commands, applicationCommands);
			const contextMenuChanges = await this.processContextMenus(
				localContextMenus,
				applicationCommands,
			);

			const processEndTime = process.hrtime.bigint();
			const processTime = Number(processEndTime - processStartTime) / 1_000_000;
			const totalTime = Number(processEndTime - fetchStartTime) / 1_000_000;

			this.logChanges(
				commandChanges,
				contextMenuChanges,
				fetchTime,
				processTime,
				totalTime,
				Commands.length,
				localContextMenus.length,
			);
		} catch (err: unknown) {
			console.error(
				`[${new Date().toISOString()}] Error during synchronization: ${
					err instanceof Error ? err.message : 'Unknown error'
				}`.red,
			);
			// Assuming global.errorHandler exists based on previous file content
			// global.errorHandler was remove now global.logger.error
			if (
				(
					global as unknown as {
						errorHandler: { handleError: (err: unknown, context: string) => Promise<void> };
					}
				).errorHandler
			) {
				await (
					global as unknown as {
						errorHandler: { handleError: (err: unknown, context: string) => Promise<void> };
					}
				).errorHandler.handleError(err, 'CommandRegistrationError');
			} else {
				// Fallback if errorHandler is missing
				console.error(err);
			}
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
					console.error(`Failed to delete command ${cmd.name}:`, err);
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
					console.error(`Failed to delete context menu ${cmd.name}:`, err);
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
		if (compareCommands(existingCommand, Command)) {
			try {
				const commandData = Command.data.toJSON();
				const defaultMemberPermissions = commandData.default_member_permissions
					? new PermissionsBitField(commandData.default_member_permissions as PermissionResolvable)
					: null;

				await existingCommand.edit({
					name: commandData.name,
					description: commandData.description ?? '',
					contexts: commandData.contexts,
					integrationTypes: commandData.integration_types ?? [0], // Default to Guild Install to fix lingering [0, 1]
					options: (commandData.options as ApplicationCommandOptionData[]) ?? [],
					dmPermission: commandData.dm_permission ?? true,
					defaultMemberPermissions,
				});
				return true;
			} catch (error) {
				console.error(`Error updating command ${Command.data.name}:`, error);
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
				integrationTypes: commandData.integration_types ?? [0], // Default to Guild Install
				options: (commandData.options as ApplicationCommandOptionData[]) ?? [],
				dmPermission: commandData.dm_permission ?? true,
				defaultMemberPermissions,
			});
		} catch (err) {
			console.error(`Failed to create command ${data.name}:`, err);
		}
	}

	private async handleExistingContextMenu(
		existingContextMenu: ApplicationCommand,
		localContextMenu: LocalContextMenu,
	): Promise<boolean> {
		if (compareContextMenus(existingContextMenu, localContextMenu)) {
			try {
				await existingContextMenu.edit(localContextMenu.data);
				return true;
			} catch (error) {
				console.error(`Error updating context menu ${localContextMenu.data.name}:`, error);
			}
		}
		return false;
	}

	private async createContextMenu(data: ContextMenuCommandBuilder): Promise<void> {
		try {
			await this.client.application?.commands.create(data);
		} catch (err) {
			console.error(`Failed to create context menu ${data.name}:`, err);
		}
	}

	private logChanges(
		commandChanges: { updated: string[]; new: string[]; deleted: string[] },
		contextMenuChanges: { updated: string[]; new: string[]; deleted: string[] },
		fetchTime: number,
		processTime: number,
		totalTime: number,
		totalCommands: number,
		totalContextMenus: number,
	): void {
		const SEPARATOR = {
			DOUBLE: '═',
			SINGLE: '─',
			LENGTH: 60,
		};

		const header = `╔${SEPARATOR.DOUBLE.repeat(SEPARATOR.LENGTH)}╗`.cyan;
		const footer = `╚${SEPARATOR.DOUBLE.repeat(SEPARATOR.LENGTH)}╝`.cyan;
		const divider = `╟${SEPARATOR.SINGLE.repeat(SEPARATOR.LENGTH)}╢`.cyan;

		console.log(header);
		console.log(`║ Command & Menu Sync Report${' '.repeat(SEPARATOR.LENGTH - 26)} ║`.cyan);
		console.log(divider);

		// Stats
		console.log(
			`║ Total Commands: ${totalCommands.toString().yellow}${' '.repeat(
				SEPARATOR.LENGTH - 16 - totalCommands.toString().length,
			)} ║`.cyan,
		);
		console.log(
			`║ Total Context Menus: ${totalContextMenus.toString().yellow}${' '.repeat(
				SEPARATOR.LENGTH - 21 - totalContextMenus.toString().length,
			)} ║`.cyan,
		);
		console.log(divider);
		console.log(
			`║ Fetch Time: ${fetchTime.toFixed(2).toString().blue}ms${' '.repeat(
				SEPARATOR.LENGTH - 13 - fetchTime.toFixed(2).toString().length,
			)} ║`.cyan,
		);
		console.log(
			`║ Process Time: ${processTime.toFixed(2).toString().green}ms${' '.repeat(
				SEPARATOR.LENGTH - 15 - processTime.toFixed(2).toString().length,
			)} ║`.cyan,
		);
		console.log(
			`║ Total Time: ${totalTime.toFixed(2).toString().yellow}ms${' '.repeat(
				SEPARATOR.LENGTH - 13 - totalTime.toFixed(2).toString().length,
			)} ║`.cyan,
		);

		// Command Changes
		if (
			commandChanges.updated.length ||
			commandChanges.new.length ||
			commandChanges.deleted.length
		) {
			console.log(divider);
			console.log(`║ App Commands Changes${' '.repeat(SEPARATOR.LENGTH - 20)} ║`.cyan);
			if (commandChanges.new.length) {
				console.log(`║   New: ${' '.repeat(SEPARATOR.LENGTH - 8)} ║`.cyan);
				commandChanges.new.forEach((cmd) =>
					console.log(
						`║     + ${cmd.green}${' '.repeat(SEPARATOR.LENGTH - 7 - cmd.length)} ║`.cyan,
					),
				);
			}
			if (commandChanges.updated.length) {
				console.log(`║   Updated: ${' '.repeat(SEPARATOR.LENGTH - 12)} ║`.cyan);
				commandChanges.updated.forEach((cmd) =>
					console.log(
						`║     ~ ${cmd.yellow}${' '.repeat(SEPARATOR.LENGTH - 7 - cmd.length)} ║`.cyan,
					),
				);
			}
			if (commandChanges.deleted.length) {
				console.log(`║   Deleted: ${' '.repeat(SEPARATOR.LENGTH - 12)} ║`.cyan);
				commandChanges.deleted.forEach((cmd) =>
					console.log(`║     - ${cmd.red}${' '.repeat(SEPARATOR.LENGTH - 7 - cmd.length)} ║`.cyan),
				);
			}
		}

		// Context Menu Changes
		if (
			contextMenuChanges.updated.length ||
			contextMenuChanges.new.length ||
			contextMenuChanges.deleted.length
		) {
			console.log(divider);
			console.log(`║ Context Menus Changes${' '.repeat(SEPARATOR.LENGTH - 21)} ║`.cyan);
			if (contextMenuChanges.new.length) {
				console.log(`║   New: ${' '.repeat(SEPARATOR.LENGTH - 8)} ║`.cyan);
				contextMenuChanges.new.forEach((cmd) =>
					console.log(
						`║     + ${cmd.green}${' '.repeat(SEPARATOR.LENGTH - 7 - cmd.length)} ║`.cyan,
					),
				);
			}
			if (contextMenuChanges.updated.length) {
				console.log(`║   Updated: ${' '.repeat(SEPARATOR.LENGTH - 12)} ║`.cyan);
				contextMenuChanges.updated.forEach((cmd) =>
					console.log(
						`║     ~ ${cmd.yellow}${' '.repeat(SEPARATOR.LENGTH - 7 - cmd.length)} ║`.cyan,
					),
				);
			}
			if (contextMenuChanges.deleted.length) {
				console.log(`║   Deleted: ${' '.repeat(SEPARATOR.LENGTH - 12)} ║`.cyan);
				contextMenuChanges.deleted.forEach((cmd) =>
					console.log(`║     - ${cmd.red}${' '.repeat(SEPARATOR.LENGTH - 7 - cmd.length)} ║`.cyan),
				);
			}
		}

		console.log(footer);
	}
}
