import { Schema, model } from 'mongoose';

const feedbackschema = new Schema({
    Guild: String,
    FeedbackChannel: String,
});

export default model('feedbackSchema', feedbackschema);