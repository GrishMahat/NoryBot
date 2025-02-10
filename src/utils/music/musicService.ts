import { Client, VoiceChannel } from 'discord.js';
export class MusicService {
  constructor(private readonly client: Client) {
    this.client = client;
  }

  async play(guildId: string, track: string, voiceChannel: VoiceChannel) { 
  }

  async pause(guildId: string, voiceChannel: VoiceChannel) {
  }

  async resume(guildId: string, voiceChannel: VoiceChannel) {
  }

  async stop(guildId: string, voiceChannel: VoiceChannel) {
  }

  async skip(guildId: string, voiceChannel: VoiceChannel) {
  }

  async queue(guildId: string, voiceChannel: VoiceChannel) {
  }

  async remove(guildId: string, voiceChannel: VoiceChannel) {
  }

  async clear(guildId: string, voiceChannel: VoiceChannel) {
  }
  


}
