/**
 * Sends a standardized JSON success envelope: { success: true, data }.
 */
export const sendSuccess = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });
