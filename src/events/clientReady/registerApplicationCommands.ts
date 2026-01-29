import type { Client } from 'discord.js';
import { CommandRegistrationService } from '@/services/CommandRegistrationService';
import { logs } from '@/services/logs';

export default async (client: Client): Promise<void> => {
	try {
		logs.info('Registering application commands', { tag: 'CommandRegistration' });
		const registrationService = new CommandRegistrationService(client);
		await registrationService.synchronize();
		logs.info('Application commands registered', { tag: 'CommandRegistration' });
	} catch (error) {
		logs.error('Failed to register application commands', {
			tag: 'CommandRegistration',
			context: error,
		});
	}
};
