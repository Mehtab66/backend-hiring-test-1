import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TuringTech IVR API',
      version: '1.0.0',
      description: 'API documentation for the TuringTech IVR call logging and activity feed.',
      contact: {
        name: 'TuringTech Support',
        url: 'https://turingtechnologies.org',
        email: 'hr@turingtechnologies.org',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api`,
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Call: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'MongoDB document ID',
              example: '60c72b2f9b1d8e001c8e4c7c',
            },
            twilioCallSid: {
              type: 'string',
              description: "Twilio's unique Call SID.",
              example: 'CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            },
            from: {
              type: 'string',
              description: "Caller's phone number.",
              example: '+12223334444',
            },
            to: {
              type: 'string',
              description: 'Your Twilio phone number that was called.',
              example: '+15556667777',
            },
            status: {
              type: 'string',
              description: 'Current status of the call.',
              enum: ['initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled'],
              example: 'completed',
            },
            direction: {
              type: 'string',
              enum: ['inbound', 'outbound'],
              default: 'inbound',
              example: 'inbound',
            },
            startTime: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the call was initiated.',
            },
            endTime: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the call ended.',
            },
            duration: {
              type: 'integer',
              description: 'Duration of the call in seconds.',
              example: 60,
            },
            digitsPressed: {
              type: 'string',
              description: 'IVR digits pressed by the caller.',
              example: '1',
            },
            actionTaken: {
              type: 'string',
              description: 'Action taken based on IVR input.',
              enum: ['forwarded', 'forwarded_completed', 'forwarded_busy', 'forwarded_no_answer', 'forwarded_failed', 'voicemail_recording_pending', 'voicemail_recorded', 'hung_up_before_action', 'error_before_action', 'invalid_input'],
              example: 'forwarded_completed',
            },
            forwardedTo: {
              type: 'string',
              description: 'Number the call was forwarded to, if applicable.',
              example: '+19998887777',
            },
            recordingUrl: {
              type: 'string',
              format: 'url',
              description: 'URL of the voicemail recording, if applicable.',
              example: 'https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RE...',
            },
            recordingDuration: {
              type: 'integer',
              description: 'Duration of the voicemail recording in seconds.',
              example: 30,
            },
            errorMessage: {
              type: 'string',
              description: 'Error message if any occurred during the call processing.',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the call record was created in the database.',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the call record was last updated.',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string', nullable: true }
          }
        }
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec; 