import User, { serializeUser } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { generateToken } from '../utils/generateToken.js';

/**
 * Authenticates a user by email/password and returns JWT + serialized DTO.
 * Unknown email and wrong password return uniform 401; deactivated accounts return 403 after password verification.
 */
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'FORBIDDEN', 'Account is deactivated');
  }

  return {
    token: generateToken(user),
    user: serializeUser(user),
  };
};

/**
 * Self-registers a candidate when ALLOW_SELF_REGISTER=true; always assigns role 'candidate'.
 */
export const registerCandidate = async ({ name, email, password, rollNo }) => {
  if (process.env.ALLOW_SELF_REGISTER !== 'true') {
    throw new ApiError(403, 'FORBIDDEN', 'Self-registration is disabled');
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'A user with this email already exists');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: password,
    role: 'candidate',
    ...(rollNo ? { rollNo } : {}),
  });

  return {
    token: generateToken(user),
    user: serializeUser(user),
  };
};

/**
 * Verifies currentPassword, updates passwordHash, increments tokenVersion to revoke old JWTs, and issues a fresh token.
 */
export const changeOwnPassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'User no longer exists');
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Current password is incorrect');
  }

  user.passwordHash = newPassword;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return {
    message: 'Password updated successfully',
    token: generateToken(user),
    user: serializeUser(user),
  };
};
