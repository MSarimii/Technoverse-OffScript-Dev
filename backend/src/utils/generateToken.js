import jwt from 'jsonwebtoken';

/**
 * Generates a signed JWT containing user id, role, and tokenVersion for revocation checks.
 */
export const generateToken = (user) => {
  const payload =
    typeof user === 'object' && user !== null
      ? {
          id: String(user._id ?? user.id),
          role: user.role,
          tokenVersion: user.tokenVersion ?? 0,
        }
      : { id: String(user), tokenVersion: 0 };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
};

/**
 * Verifies a Bearer JWT and returns its decoded payload.
 */
export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);
