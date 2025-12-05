import type { Document, SchemaOptions } from 'mongoose';

export interface BaseDocument extends Document {
	createdAt: Date;
	updatedAt: Date;
}

export const baseSchemaOptions: SchemaOptions = {
	timestamps: true, // Automatically manage createdAt and updatedAt
	toJSON: {
		virtuals: true,
	},
	toObject: {
		virtuals: true,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		transform(doc: any, ret: any, options: any): any {
			ret.id = ret._id;
			delete ret._id;
			delete ret.__v;
			return ret;
		},
	},
};
