// import { VoiceState } from "@discordjs/voice"
import { Client, GuildMember } from 'discord.js';

function getYoutubeId(url: string) {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|\/watch\?v=|\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function checkSameVoiceChannel(member: GuildMember, botMember: GuildMember) {
  if (!member.voice.channel) return false;
  if (!botMember.voice.channel) return false;
  return member.voice.channel.id === botMember.voice.channel.id;
}

function GuildVoiceChannel(client: Client, guildId: string) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;
  const voiceChannel = guild?.channels.cache.find((channel) =>
    channel.isVoiceBased()
  );
  return voiceChannel;
}

export { getYoutubeId, checkSameVoiceChannel, GuildVoiceChannel };
