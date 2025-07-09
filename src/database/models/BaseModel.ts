import { Document, SchemaOptions, ToObjectOptions } from 'mongoose';

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
		transform: function (doc: any, ret: any, options: any): any {
			ret.id = ret._id;
			delete ret._id;
			delete ret.__v;
			return ret;
		},
	},
};
