import { Router, RequestHandler } from 'express';
import {
  handleIncomingCall,
  handleGatheredInput,
  handleCallStatus,       // Import new handler
  handleRecordingStatus   // Import new handler
} from '../controllers/twilio.controller';

const router = Router();

// Twilio Voice Webhook - receives incoming calls
router.post('/voice', handleIncomingCall as RequestHandler);

// Twilio Gather Webhook - receives digits pressed by the user
router.post('/gather', handleGatheredInput as RequestHandler); // Make sure this line is active

router.post('/call-status', handleCallStatus as RequestHandler);         // Add route for Dial action

router.post('/recording-status', handleRecordingStatus as RequestHandler); // Add route for Record action

export default router;