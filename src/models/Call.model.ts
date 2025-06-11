import mongoose, { Schema, Document } from 'mongoose';

export interface ICall extends Document {
  twilioCallSid: string;
  from: string;
  to: string;
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  direction: 'inbound' | 'outbound'; // Though we only handle inbound for now
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  digitsPressed?: string;
  actionTaken?: 'forwarded' | 'forwarded_completed' | 'forwarded_busy' | 'forwarded_no_answer' | 'forwarded_failed' | 'voicemail_recording_pending' | 'voicemail_recorded' | 'hung_up_before_action' | 'error_before_action' | 'invalid_input';
  forwardedTo?: string;
  recordingUrl?: string;
  recordingDuration?: number;
  errorMessage?: string;
  // Mongoose automatically adds createdAt and updatedAt if timestamps: true
}

const CallSchema: Schema = new Schema(
  {
    twilioCallSid: { type: String, required: true, unique: true, index: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled'],
      default: 'initiated',
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'inbound',
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    duration: { type: Number }, // in seconds
    digitsPressed: { type: String },
    actionTaken: {
      type: String,
      enum: ['forwarded', 'forwarded_completed', 'forwarded_busy', 'forwarded_no_answer', 'forwarded_failed', 'voicemail_recording_pending', 'voicemail_recorded', 'hung_up_before_action', 'error_before_action', 'invalid_input'],
    },
    forwardedTo: { type: String },
    recordingUrl: { type: String },
    recordingDuration: { type: Number },
    errorMessage: { type: String },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Create and export the model
const Call = mongoose.model<ICall>('Call', CallSchema);

export default Call;