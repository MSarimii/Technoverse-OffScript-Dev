import express from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response.js';
import { now } from '../utils/time.js';

/**
 * Reports service liveness, database connection status, process uptime, and server clock.
 */
export const getHealth = (_req, res) => {
  return sendSuccess(res, {
    status: 'healthy',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    serverNow: now().toISOString(),
  });
};

/**
 * Returns authoritative server time in ISO-8601 format for client timer sync.
 */
export const getTime = (_req, res) => {
  return sendSuccess(res, {
    serverNow: now().toISOString(),
  });
};

const healthRouter = express.Router();
healthRouter.get('/', getHealth);

export const timeRouter = express.Router();
timeRouter.get('/', getTime);

export default healthRouter;
