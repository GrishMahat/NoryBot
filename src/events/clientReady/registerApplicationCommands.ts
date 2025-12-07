import { CommandRegistrationService } from '@/services/CommandRegistrationService';
import type { Client } from 'discord.js';

export default async (client: Client): Promise<void> => {
	const registrationService = new CommandRegistrationService(client);
	await registrationService.synchronize();
};
