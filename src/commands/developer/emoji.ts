import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
// import path from "path"
// import fs from "fs/promises"
// const configfile = path.join(
//   process.cwd(),
//   "src/config/emoji.ts",
// )
const emojiCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('emoji')
		.setDescription('this is for set command')
		.addSubcommand((subcommand) =>
			subcommand.setName('upload').setDescription('uplode the al the emoji'),
		)
		.addSubcommand((subcommade) =>
			subcommade
				.setName('updateconfig')
				.setDescription('update all the  emoji comfig'),
		).toJSON,
	cooldown: 10,
	nsfwMode: false,
	testMode: true,
	devOnly: true,
  category: 'Developer',
  run: async (client: Client, interaction: ChatInputCommandInteraction): Promise<void> =>{
    
  }
};

// function upload(client) {
  
// }

// function updateconfig(client) {

  
// }

export default emojiCommand