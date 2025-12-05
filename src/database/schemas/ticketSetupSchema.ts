import { type Document, Schema, model } from 'mongoose';

export interface ICustomOption {
	label: string;
	value: string;
	description: string;
}

export interface ITicketSetup extends Document {
	guildID: string;
	ticketChannelID: string;
	staffRoleID: string;
	ticketType: string;
	categoryID: string;
	logChannelID: string;
	messageID: string;
	customOptions: ICustomOption[];
}

const ticketSetupSchema = new Schema<ITicketSetup>(
	{
		guildID: { type: String, required: true },
		ticketChannelID: { type: String, required: true },
		staffRoleID: { type: String, required: true },
		ticketType: { type: String, required: true },
		categoryID: { type: String, required: true },
		logChannelID: { type: String, required: true },
		messageID: { type: String, required: true },
		customOptions: [
			{
				label: { type: String, required: true },
				value: { type: String, required: true },
				description: { type: String, required: true },
			},
		],
	},
	{
		strict: false,
	},
);

export default model<ITicketSetup>('ticketSetup', ticketSetupSchema);
