import express from 'express';
import healthRouter, { timeRouter } from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import questionRoutes from './questionRoutes.js';
import examRoutes from './examRoutes.js';
import candidateDirectoryRoutes from './candidateDirectoryRoutes.js';
import candidateExamRoutes from './candidateExamRoutes.js';
import candidateResultRoutes from './candidateResultRoutes.js';
import attemptRoutes from './attemptRoutes.js';
import incidentRoutes from './incidentRoutes.js';
import meRoutes from './meRoutes.js';
import verifyRoutes from './verifyRoutes.js';
import disputeRoutes from './disputeRoutes.js';
import aiRoutes from './aiRoutes.js';

/**
 * Central modular API router mounted at /api.
 */
export const apiRouter = express.Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/time', timeRouter);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/me', meRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/questions', questionRoutes);
apiRouter.use('/exams', examRoutes);
apiRouter.use('/candidates', candidateDirectoryRoutes);
apiRouter.use('/candidate/exams', candidateExamRoutes);
apiRouter.use('/candidate/results', candidateResultRoutes);
apiRouter.use('/attempts', attemptRoutes);
apiRouter.use('/incidents', incidentRoutes);
apiRouter.use('/verify', verifyRoutes);
apiRouter.use('/disputes', disputeRoutes);
apiRouter.use('/ai', aiRoutes);

export default apiRouter;
