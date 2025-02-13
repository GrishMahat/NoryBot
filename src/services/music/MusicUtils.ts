import { Client, GuildMember } from 'discord.js';

function extractYoutubeId(url: string): string | null {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|\/watch\?v=|\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function areMembersInSameVoiceChannel(
  member: GuildMember,
  botMember: GuildMember
): boolean {
  const memberChannel = member.voice.channel;
  const botChannel = botMember.voice.channel;
  return memberChannel && botChannel && memberChannel.id === botChannel.id;
}

function findFirstVoiceChannel(client: Client, guildId: string) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;
  return guild.channels.cache.find((channel) => channel.isVoiceBased()) || null;
}

function getVoiceChannel(client: Client, guildId: string) {
  return findFirstVoiceChannel(client, guildId);
}

export {
  extractYoutubeId,
  areMembersInSameVoiceChannel,
  findFirstVoiceChannel,
  getVoiceChannel,
};
