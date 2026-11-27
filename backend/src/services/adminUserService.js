import Attempt from '../models/Attempt.js';
import Exam from '../models/Exam.js';
import User, { serializeUser } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/sanitize.js';

/**
 * Lists users with optional role/isActive filters, escaped text search, and pagination.
 */
export const listUsers = async ({ role, isActive, q, page = 1, limit = 20 }) => {
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;
  if (q && q.trim() !== '') {
    const regex = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { rollNo: regex }];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(serializeUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

/**
 * Admin creates a user with explicit role.
 */
export const createAdminUser = async ({ name, email, password, role, rollNo }) => {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', 'A user with this email already exists');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: password,
    role,
    ...(rollNo ? { rollNo } : {}),
  });

  return { user: serializeUser(user) };
};

/**
 * Updates user attributes; bumps tokenVersion on role change or deactivation and prevents admin self-lockout.
 */
export const updateAdminUser = async (actor, targetId, updates) => {
  const user = await User.findById(targetId);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  const isSelf = String(actor._id ?? actor.id) === String(targetId);
  if (isSelf) {
    if (updates.isActive === false || (updates.role !== undefined && updates.role !== actor.role)) {
      throw new ApiError(409, 'CONFLICT', 'Admins cannot deactivate or demote their own account');
    }
  }

  const roleChanged = updates.role !== undefined && updates.role !== user.role;
  const deactivated = updates.isActive === false && user.isActive !== false;

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.isActive !== undefined) user.isActive = updates.isActive;
  if ('rollNo' in updates) {
    user.rollNo = updates.rollNo === null || updates.rollNo === '' ? undefined : updates.rollNo;
  }

  if (roleChanged || deactivated) {
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  }

  await user.save();
  return { user: serializeUser(user) };
};

/**
 * Resets a target user's password and bumps tokenVersion to revoke existing JWTs.
 */
export const resetAdminUserPassword = async (targetId, { newPassword }) => {
  const user = await User.findById(targetId);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }

  user.passwordHash = newPassword;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  return {
    message: 'Password reset successfully',
    user: serializeUser(user),
  };
};

/**
 * Returns admin dashboard overview counts.
 */
export const getAdminOverview = async () => {
  const [grouped, examCount, attemptCount] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: { role: '$role', isActive: '$isActive' },
          count: { $sum: 1 },
        },
      },
    ]),
    Exam.countDocuments(),
    Attempt.countDocuments({ isSandbox: false }),
  ]);

  const summary = {
    total: 0,
    active: 0,
    inactive: 0,
    byRole: { admin: 0, examiner: 0, candidate: 0 },
  };

  for (const row of grouped) {
    const count = row.count;
    const role = row._id.role;
    const active = row._id.isActive;
    summary.total += count;
    if (active) summary.active += count;
    else summary.inactive += count;
    if (role in summary.byRole) summary.byRole[role] += count;
  }

  return {
    users: summary,
    exams: examCount,
    attempts: attemptCount,
  };
};
