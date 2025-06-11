import { Request, Response } from 'express';
import Call from '../models/Call.model';

export const getAllCalls = async (req: Request, res: Response) => {
  try {
    console.log('hello into calls')
    const calls = await Call.find()
      .sort({ startTime: -1 }) // Sort by start time, newest first
      .lean(); // .lean() returns plain JavaScript objects, not Mongoose documents (faster for read-only)

    res.status(200).json(calls);
  } catch (error) {
    console.error('Error fetching calls for activity feed:', error);
    res.status(500).json({ 
      message: 'Error fetching call logs', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}; 