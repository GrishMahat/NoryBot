import 'colors';
import {
  ApplicationCommand,
  Client,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
} from 'discord.js';
import { config } from '../../config/config.js';
import getLocalContextMenus from '../../utils/getLocalContextMenus.js';
import getApplicationCommands from '../../utils/getApplicationCommands.js';
import compareContextMenus from '../../utils/contextmenusComparing.js';
import { LocalContextMenu } from '../../types/index.js';

export default async (client: Client): Promise<void> => {
  try {
    const [localContextMenus, applicationCommands] = await Promise.all([
      getLocalContextMenus(),
      getApplicationCommands(client),
    ]);

    if (!localContextMenus || !applicationCommands) {
      throw new Error('Failed to fetch context menus');
    }

    const deletedContextMenus: string[] = [];
    const updatedContextMenus: string[] = [];
    const newContextMenus: string[] = [];

    await deleteUnusedContextMenus(
      applicationCommands,
      localContextMenus,
      deletedContextMenus
    );

    await updateOrCreateContextMenus(
      applicationCommands,
      localContextMenus,
      client,
      updatedContextMenus,
      newContextMenus
    );

    logContextMenuChanges(
      localContextMenus,
      updatedContextMenus,
      newContextMenus,
      deletedContextMenus
    );
  } catch (err: any) {
    console.error(
      `[${new Date().toISOString()}] Error during context menu sync: ${
        err?.message ?? 'Unknown error'
      }`.red
    );
  }
};

async function deleteUnusedContextMenus(
  applicationCommands: ApplicationCommand[],
  localContextMenus: LocalContextMenu[],
  deletedContextMenus: string[]
): Promise<void> {
  const localContextMenuNames = new Set(
    localContextMenus.map((menu) => menu.data?.name).filter(Boolean)
  );
  const contextMenusToDelete = applicationCommands.filter(
    (cmd) =>
      (cmd.type === ApplicationCommandType.User ||
        cmd.type === ApplicationCommandType.Message) &&
      cmd.name &&
      !localContextMenuNames.has(cmd.name)
  );

  await Promise.all(
    contextMenusToDelete.map(async (cmd) => {
      if (cmd.name) {
        await cmd.delete();
        deletedContextMenus.push(cmd.name);
      }
    })
  );
}

async function updateOrCreateContextMenus(
  applicationCommands: ApplicationCommand[],
  localContextMenus: LocalContextMenu[],
  client: Client,
  updatedContextMenus: string[],
  newContextMenus: string[]
): Promise<void> {
  for (const localContextMenu of localContextMenus) {
    try {
      if (
        !localContextMenu ||
        !localContextMenu.data ||
        !localContextMenu.data.name
      ) {
        continue;
      }

      const { data } = localContextMenu;
      const contextMenuName = data.name;

      const existingContextMenu = applicationCommands.find(
        (cmd) =>
          cmd.name === contextMenuName &&
          (cmd.type === 1 || cmd.type === 2 || cmd.type === 3) // 1 for ChatInput, 2 for User, 3 for Message
      );

      if (existingContextMenu) {
        const isUpdated = await handleExistingContextMenu(
          existingContextMenu,
          localContextMenu
        );
        if (isUpdated) updatedContextMenus.push(contextMenuName);
      } else {
        await createContextMenu(client, data);
        newContextMenus.push(contextMenuName);
      }
    } catch (error: any) {
      console.error(
        `[${new Date().toISOString()}] Error processing context menu ${
          localContextMenu.data?.name
        }: ${error.message}`.red
      );
    }
  }
}

async function handleExistingContextMenu(
  existingContextMenu: ApplicationCommand,
  localContextMenu: LocalContextMenu
): Promise<boolean> {
  const needsUpdate = compareContextMenus(
    existingContextMenu,
    localContextMenu
  );

  if (needsUpdate) {
    try {
      await existingContextMenu.edit(localContextMenu.data);
      return true;
    } catch (error: any) {
      console.error(
        `[${new Date().toISOString()}] Error updating context menu ${
          localContextMenu.data.name
        }: ${error.message}`.red
      );
      return false;
    }
  }
  return false;
}

async function createContextMenu(
  client: Client,
  data: ContextMenuCommandBuilder
): Promise<void> {
  if (!data || !data.name) {
    return;
  }

  try {
    await client.application?.commands.create(data);
  } catch (err: any) {
    console.error(
      `[${new Date().toISOString()}] Failed to create context menu ${
        data.name
      }: ${err?.message ?? 'Unknown error'}`.red
    );
  }
}

function logContextMenuChanges(
  localContextMenus: LocalContextMenu[],
  updatedContextMenus: string[],
  newContextMenus: string[],
  deletedContextMenus: string[]
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
  console.log(
    `║ Context Menu Status${' '.repeat(SEPARATOR.LENGTH - 19)} ║`.cyan
  );
  console.log(divider);
  console.log(
    `║ Total Menus: ${localContextMenus.length.toString().yellow}${' '.repeat(SEPARATOR.LENGTH - 15 - localContextMenus.length.toString().length)} ║`
      .cyan
  );

  if (updatedContextMenus.length) {
    console.log(divider);
    console.log(`║ Updated Menus:${' '.repeat(SEPARATOR.LENGTH - 14)} ║`.cyan);
    updatedContextMenus.forEach((menu) =>
      console.log(
        `║  • ${menu.yellow}${' '.repeat(SEPARATOR.LENGTH - menu.length - 4)} ║`
          .cyan
      )
    );
  }

  if (newContextMenus.length) {
    console.log(divider);
    console.log(`║ New Menus:${' '.repeat(SEPARATOR.LENGTH - 11)} ║`.cyan);
    newContextMenus.forEach((menu) =>
      console.log(
        `║  • ${menu.green}${' '.repeat(SEPARATOR.LENGTH - menu.length - 4)} ║`
          .cyan
      )
    );
  }

  if (deletedContextMenus.length) {
    console.log(divider);
    console.log(`║ Deleted Menus:${' '.repeat(SEPARATOR.LENGTH - 14)} ║`.cyan);
    deletedContextMenus.forEach((menu) =>
      console.log(
        `║  • ${menu.red}${' '.repeat(SEPARATOR.LENGTH - menu.length - 4)} ║`
          .cyan
      )
    );
  }

  console.log(footer);
}
