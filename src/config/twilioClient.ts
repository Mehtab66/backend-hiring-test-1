import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("Twilio credentials (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN) are missing in .env");
  process.exit(1);
}

const client = twilio(accountSid, authToken);
const VoiceResponse = twilio.twiml.VoiceResponse;

export { client, VoiceResponse };