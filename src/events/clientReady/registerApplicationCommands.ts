import type { Client } from 'discord.js';
import { CommandRegistrationService } from '@/services/CommandRegistrationService';

export default async (client: Client): Promise<void> => {
	const registrationService = new CommandRegistrationService(client);
	await registrationService.synchronize();
};
