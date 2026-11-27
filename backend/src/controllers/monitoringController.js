import {
  createAnnouncement,
  getExamMonitor,
  listAnnouncements,
  listExamIncidents,
  reviewIncident,
} from '../services/monitoringService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const getExamMonitorController = asyncHandler(async (req, res) => {
  const data = await getExamMonitor({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});

export const listExamIncidentsController = asyncHandler(async (req, res) => {
  const data = await listExamIncidents({
    user: req.user,
    examId: req.params.id,
    query: req.query,
  });
  return sendSuccess(res, data, 200);
});

export const reviewIncidentController = asyncHandler(async (req, res) => {
  const data = await reviewIncident({
    user: req.user,
    incidentId: req.params.id,
    reviewStatus: req.body.reviewStatus,
    reviewerNote: req.body.reviewerNote,
  });
  return sendSuccess(res, data, 200);
});

export const createAnnouncementController = asyncHandler(async (req, res) => {
  const data = await createAnnouncement({
    user: req.user,
    examId: req.params.id,
    message: req.body.message,
  });
  return sendSuccess(res, data, 201);
});

export const listAnnouncementsController = asyncHandler(async (req, res) => {
  const data = await listAnnouncements({ user: req.user, examId: req.params.id });
  return sendSuccess(res, data, 200);
});
