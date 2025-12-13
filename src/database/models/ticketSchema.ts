import { type Document, model, Schema } from 'mongoose';

interface ITicket extends Document {
	guildID: string;
	ticketMemberID: string;
	ticketChannelID: string;
	subject?: string;
	description?: string;
	parentTicketChannelID: string;
	closed: boolean;
	membersAdded: string[];
	claimedBy: string | null;
	createdAt: Date;
	status: 'open' | 'closed' | 'locked';
	closeReason: string;
	actionLog: string[];
	updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
	{
		guildID: { type: String, required: true },
		ticketMemberID: { type: String, required: true },
		ticketChannelID: { type: String, required: true },
		subject: { type: String, required: false },
		description: { type: String, required: false },
		parentTicketChannelID: { type: String, required: true },
		closed: { type: Boolean, default: false },
		membersAdded: { type: [String], default: [] },
		claimedBy: { type: String, default: null },
		createdAt: { type: Date, default: Date.now },
		status: {
			type: String,
			enum: ['open', 'closed', 'locked'],
			default: 'open',
		},
		closeReason: { type: String, default: '' },
		actionLog: { type: [String], default: [] },
	},
	{
		strict: false,
		timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
	},
);

export default model<ITicket>('Ticket', ticketSchema);
