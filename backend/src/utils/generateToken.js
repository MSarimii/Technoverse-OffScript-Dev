import jwt from 'jsonwebtoken';

/**
 * Generates a signed JWT for the provided user ID.
 * @param {string} id - The MongoDB user ObjectId
 * @returns {string} Signed JWT string
 */
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};
