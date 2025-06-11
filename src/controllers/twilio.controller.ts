import { Request, Response } from 'express';
import { VoiceResponse } from '../config/twilioClient'; // Use our configured VoiceResponse
// import Call from '../models/Call.model'; // Import the Call model
import Call, { ICall } from '../models/Call.model';

export const handleIncomingCall = async (req: Request, res: Response) => {
    console.log('Incoming call received:', req.body);
    const { CallSid, From, To, CallStatus } = req.body;

    try {
        // Log the call in the database
        // Check if a call with this SID already exists to prevent duplicates if Twilio retries
        let call = await Call.findOne({ twilioCallSid: CallSid });
        if (!call) {
            call = new Call({
                twilioCallSid: CallSid,
                from: From,
                to: To,
                status: 'initiated', // Or map CallStatus from Twilio if appropriate here
                direction: 'inbound',
                startTime: new Date(),
            });
            await call.save();
            console.log(`Call ${CallSid} logged with ID ${call._id}`);
        } else {
            console.log(`Call ${CallSid} already exists in DB.`);
            // Optionally update status if needed, e.g. if Twilio sends 'ringing'
            if (call.status !== CallStatus && CallStatus) {
                call.status = CallStatus;
                await call.save();
            }
        }

        // Create a TwiML response
        const twiml = new VoiceResponse();

        const gather = twiml.gather({
            numDigits: 1,
            action: '/twilio/gather', // We will create this endpoint next
            method: 'POST',
            timeout: 10, // Seconds to wait for input
        });
        gather.say('Welcome to Turing Tech. Press 1 to be connected to an agent. Press 2 to leave a voicemail.');

        // If no input is received, say this message and hang up
        twiml.say('We did not receive any input. Goodbye.');
        twiml.hangup();

        res.type('text/xml');
        res.send(twiml.toString());
        console.log('Responded to Twilio with initial TwiML.');

    } catch (error) {
        console.error('Error handling incoming call:', error);
        const twiml = new VoiceResponse();
        twiml.say('We are sorry, an error occurred on our end. Please try again later.');
        twiml.hangup();
        res.type('text/xml');
        res.status(500).send(twiml.toString());
    }
};

export const handleGatheredInput = async (req: Request, res: Response) => {
    const { Digits, CallSid } = req.body;
    const twiml = new VoiceResponse();
    console.log(`Gathered input for CallSid: ${CallSid}, Digits: ${Digits}`);

    try {
        const call = await Call.findOne({ twilioCallSid: CallSid });
        if (!call) {
            console.error(`Call ${CallSid} not found in database for gather action.`);
            twiml.say('An error occurred. We could not find your call record. Goodbye.');
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        call.digitsPressed = Digits; // Log the pressed digit

        if (Digits === '1') {
            // Option 1: Forward Call
            call.actionTaken = 'forwarded';
            const personalPhoneNumber = process.env.MY_PERSONAL_PHONE_NUMBER;
            const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

            if (!personalPhoneNumber) {
                console.error('MY_PERSONAL_PHONE_NUMBER is not set in .env');
                twiml.say('Configuration error: Forwarding number not set. Please contact support.');
                call.errorMessage = 'MY_PERSONAL_PHONE_NUMBER not set';
                call.actionTaken = 'error_before_action';
            } else if (!twilioPhoneNumber) {
                console.error('TWILIO_PHONE_NUMBER is not set in .env for callerId');
                twiml.say('Configuration error: Caller ID for forwarding not set. Please contact support.');
                call.errorMessage = 'TWILIO_PHONE_NUMBER not set for callerId';
                call.actionTaken = 'error_before_action';
            } else {
                twiml.say('Forwarding your call. Please wait.');
                const dial = twiml.dial({
                    callerId: twilioPhoneNumber,
                    action: '/twilio/call-status',
                    method: 'POST',
                });
                dial.number(personalPhoneNumber);
                call.forwardedTo = personalPhoneNumber;
                console.log(`Forwarding call ${CallSid} to ${personalPhoneNumber}`);
            }
        } else if (Digits === '2') {
            // Option 2: Leave Voicemail
            call.actionTaken = 'voicemail_recording_pending';
            twiml.say('Please leave your message after the beep. Press any key or hang up when finished.');
            twiml.record({
                action: '/twilio/recording-status',
                method: 'POST',
                maxLength: 60,
                finishOnKey: 'any',
                playBeep: true,
            });
            twiml.say('If you are done recording, please hang up. Otherwise, we will hang up shortly.');
            console.log(`Initiating voicemail recording for call ${CallSid}`);
        } else {
            // Invalid Input
            call.actionTaken = 'invalid_input';
            twiml.say('Invalid input. Please try again.');
            twiml.redirect({ method: 'POST' }, '/twilio/voice');
            console.log(`Invalid input '${Digits}' for call ${CallSid}. Redirecting.`);
        }

        await call.save();
        res.type('text/xml').send(twiml.toString());

    } catch (error) {
        console.error(`Error handling gathered input for CallSid ${CallSid}:`, error);
        try {
            const callToUpdate = await Call.findOne({ twilioCallSid: CallSid });
            if (callToUpdate) {
                callToUpdate.errorMessage = error instanceof Error ? error.message : 'Unknown error during gather';
                callToUpdate.actionTaken = 'error_before_action';
                await callToUpdate.save();
            }
        } catch (dbError) {
            console.error(`Failed to update call record with error for ${CallSid}:`, dbError);
        }

        const errorTwiml = new VoiceResponse();
        errorTwiml.say('We are sorry, an error occurred while processing your request. Goodbye.');
        errorTwiml.hangup();
        res.type('text/xml').status(500).send(errorTwiml.toString());
    }
};


export const handleCallStatus = async (req: Request, res: Response) => {
  const {
    CallSid,        // SID of the parent call
    CallStatus,     // Status of the parent call (e.g., completed, canceled, failed, busy, no-answer)
    CallDuration,   // Duration of the parent call
    DialCallSid,    // SID of the outbound dialed leg (if this is from a <Dial> action)
    DialCallStatus, // Status of the outbound dialed leg
    DialCallDuration // Duration of the outbound dialed leg
    // Add other parameters you might need, like 'AnsweredBy' for <Dial>
  } = req.body;

  console.log(`Call Status Callback received. Parent CallSid: ${CallSid}`, req.body);

  try {
    const call = await Call.findOne({ twilioCallSid: CallSid });
    if (!call) {
      console.error(`Call ${CallSid} not found for status update.`);
      // If call not found, we can't do much with DB but must respond to Twilio
      return res.status(200).send(); // Acknowledge Twilio
    }

    // This callback can be for the parent call's overall status,
    // or for the result of a <Dial> action.

    if (DialCallSid) {
      // This callback is likely due to the <Dial> action completing
      console.log(`Dial action completed for CallSid ${CallSid}. DialCallSid: ${DialCallSid}, DialCallStatus: ${DialCallStatus}`);
      call.status = 'completed'; // Parent call is considered completed after dial attempt.
                                 // CallStatus from req.body might reflect the parent call's final state better.
      if (CallStatus) call.status = CallStatus.toLowerCase();


      if (DialCallStatus === 'completed') {
        call.actionTaken = 'forwarded_completed';
      } else if (DialCallStatus === 'busy') {
        call.actionTaken = 'forwarded_busy';
      } else if (DialCallStatus === 'no-answer') {
        call.actionTaken = 'forwarded_no_answer';
      } else if (DialCallStatus === 'failed' || DialCallStatus === 'canceled') {
        call.actionTaken = 'forwarded_failed';
        call.errorMessage = `Forwarded call leg failed with status: ${DialCallStatus}`;
      } else {
        // Other statuses like 'ringing', 'in-progress' might not be final for 'actionTaken'
        // but can be logged if desired.
        if(call.actionTaken === 'forwarded') { // If it was just 'forwarded', update with specific outcome
            call.actionTaken = `forwarded_${DialCallStatus || 'unknown'}` as ICall['actionTaken'];
        }
      }
      // The DialCallDuration is for the forwarded leg.
      // The CallDuration from req.body is for the parent call up to this point.
    } else {
      // This callback is for the general status of the parent call
      // (e.g. if user hung up before gather, or after voicemail was left but before hangup TwiML fully processed by Twilio)
      console.log(`General status update for CallSid ${CallSid}. CallStatus: ${CallStatus}`);
      if (CallStatus) {
        call.status = CallStatus.toLowerCase(); // Ensure consistent case
      }
    }

    // Update common fields
    if (CallDuration) {
      call.duration = parseInt(CallDuration, 10);
    }
    call.endTime = new Date(); // Set/update end time

    // If the call was 'initiated' or 'ringing' and is now 'completed' without specific action,
    // it means the user likely hung up before making a choice or during a prompt.
    if ( (call.status === 'completed' || call.status === 'canceled') && !call.actionTaken) {
      call.actionTaken = 'hung_up_before_action';
    }

    await call.save();
    console.log(`Call ${CallSid} updated with status: ${call.status}, action: ${call.actionTaken}`);

    // Twilio expects a 200 OK or TwiML. For status callbacks, often no further TwiML is needed.
    // An empty <Response/> is also a valid TwiML response.
    const twiml = new VoiceResponse();
    res.type('text/xml').send(twiml.toString());
    // Or simply: res.status(200).send();

  } catch (error) {
    console.error(`Error in handleCallStatus for ${CallSid}:`, error);
     try {
        const callToUpdate = await Call.findOne({ twilioCallSid: CallSid });
        if (callToUpdate) {
            callToUpdate.errorMessage = `Error in call status: ${error instanceof Error ? error.message : 'Unknown error'}`;
            await callToUpdate.save();
        }
    } catch (dbError) {
        console.error(`Failed to update call record with error during call status for ${CallSid}:`, dbError);
    }
    // Even on error, respond to Twilio so it doesn't keep retrying.
    res.status(200).send(); // Or send an error TwiML if appropriate, but 200 OK is fine for status.
  }
};

export const handleRecordingStatus = async (req: Request, res: Response) => {
  // Parameters typically sent to the <Record action=""> webhook:
  // RecordingUrl, RecordingDuration, CallSid, Digits (if finishOnKey used something other than #/*)
  // RecordingSid is also often present.
  const { CallSid, RecordingUrl, RecordingDuration, Digits } = req.body;
  console.log(`Recording Status Callback (from <Record action>) for CallSid: ${CallSid}`, req.body);

  const twiml = new VoiceResponse();

  try {
    const call = await Call.findOne({ twilioCallSid: CallSid });
    if (!call) {
      console.error(`Call ${CallSid} not found for recording status update.`);
      twiml.say('An error occurred with your call record. Goodbye.');
      twiml.hangup();
      return res.type('text/xml').send(twiml.toString());
    }

    // For the <Record action=""> webhook, success is mainly indicated by the presence of RecordingUrl.
    if (RecordingUrl && RecordingUrl.startsWith('https://api.twilio.com')) {
      call.recordingUrl = RecordingUrl;
      call.recordingDuration = RecordingDuration ? parseInt(RecordingDuration, 10) : undefined;
      call.actionTaken = 'voicemail_recorded';
      call.status = 'completed'; // The parent call interaction for voicemail is now completed
      call.endTime = new Date();
      if (call.startTime) {
          call.duration = Math.round((call.endTime.getTime() - call.startTime.getTime()) / 1000);
      }
      // If 'finishOnKey' was used and resulted in 'Digits', you might want to log call.digitsPressed here
      // if it's different from the IVR menu digits. For now, we assume IVR digits are already logged.
      await call.save();
      console.log(`Voicemail saved for ${CallSid}: ${RecordingUrl}`);
      twiml.say('Thank you for your message. Goodbye.');
    } else {
      // RecordingUrl is not present or invalid, or some other issue occurred.
      console.log(`Recording not successful or RecordingUrl missing for ${CallSid}. RecordingUrl: ${RecordingUrl}`);
      call.actionTaken = 'voicemail_recorded'; // The intent was to record.
      call.status = 'completed';
      call.endTime = new Date();
      if (call.startTime) {
        call.duration = Math.round((call.endTime.getTime() - call.startTime.getTime()) / 1000);
      }
      call.errorMessage = `Voicemail attempt made, but no valid RecordingUrl was received. URL: ${RecordingUrl || 'N/A'}`;
      await call.save();
      twiml.say('No recording was received, or an error occurred with the recording. Goodbye.');
    }

    twiml.hangup();
    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error(`Error in handleRecordingStatus for ${CallSid}:`, error);
    try {
        const callToUpdate = await Call.findOne({ twilioCallSid: CallSid });
        if (callToUpdate) {
            callToUpdate.errorMessage = `Error in recording status: ${error instanceof Error ? error.message : 'Unknown error'}`;
            if(callToUpdate.actionTaken === 'voicemail_recording_pending') callToUpdate.actionTaken = 'error_before_action';
            callToUpdate.status = 'failed'; // Mark as failed if error during this callback
            await callToUpdate.save();
        }
    } catch (dbError) {
        console.error(`Failed to update call record with error during recording status for ${CallSid}:`, dbError);
    }

    const errorTwiml = new VoiceResponse();
    errorTwiml.say('An error occurred while finalizing your voicemail. Goodbye.');
    errorTwiml.hangup();
    res.type('text/xml').status(500).send(errorTwiml.toString());
  }
};