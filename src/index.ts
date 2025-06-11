// src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import twilioRoutes from './routes/twilio.routes'; // Import Twilio routes
import apiRoutes from './routes/api.routes';
import swaggerSpec from './config/swagger';
import { VoiceResponse } from './config/twilioClient'; // For error handling

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '../public')));

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req: Request, res: Response) => {
  res.send('IVR Server is running!');
});

// Mount Twilio routes
app.use('/twilio', twilioRoutes); // All routes in twilio.routes.ts will be prefixed with /twilio

// Mount API routes
app.use('/api', apiRoutes);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err.stack);
  // For Twilio webhooks, if an error bubbles up, try to respond with TwiML
  if (res.headersSent) {
    return next(err);
  }
  try {
    const twiml = new VoiceResponse();
    twiml.say('An unexpected application error occurred. Goodbye.');
    twiml.hangup();
    res.type('text/xml');
    res.status(500).send(twiml.toString());
  } catch (e) {
    // If creating TwiML fails, send a plain text error
    res.status(500).send('An unexpected application error occurred.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`ngrok should be forwarding to this port.`);
  console.log(`Configure Twilio voice webhook to: YOUR_NGROK_URL/twilio/voice`);
});