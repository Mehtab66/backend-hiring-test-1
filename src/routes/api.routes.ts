import { Router } from 'express';
import { getAllCalls } from '../controllers/api.controller';

const router = Router();

/**
 * @openapi
 * /calls:
 *   get:
 *     tags:
 *       - Calls
 *     summary: Retrieve a list of all call logs
 *     description: Fetches all call records from the database, sorted by start time in descending order.
 *     responses:
 *       200:
 *         description: A list of call logs.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Call'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/calls', getAllCalls);
export default router; 