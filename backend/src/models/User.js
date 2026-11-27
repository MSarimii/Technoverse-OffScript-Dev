import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DEFAULT_PREFERENCES = {
  theme: 'dark',
  fontScale: 'md',
  layout: 'standard',
  showTimer: true,
  highContrast: false,
};

const preferencesSchema = new mongoose.Schema(
  {
    theme: {
      type: String,
      enum: ['dark', 'light', 'system'],
      default: DEFAULT_PREFERENCES.theme,
    },
    fontScale: { type: String, enum: ['sm', 'md', 'lg'], default: DEFAULT_PREFERENCES.fontScale },
    layout: {
      type: String,
      enum: ['standard', 'compact', 'split'],
      default: DEFAULT_PREFERENCES.layout,
    },
    showTimer: { type: Boolean, default: DEFAULT_PREFERENCES.showTimer },
    highContrast: { type: Boolean, default: DEFAULT_PREFERENCES.highContrast },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Please provide a password'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'examiner', 'candidate'],
      default: 'candidate',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    rollNo: {
      type: String,
      trim: true,
    },
    preferences: {
      type: preferencesSchema,
      default: () => ({ ...DEFAULT_PREFERENCES }),
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ rollNo: 1 }, { sparse: true });

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/**
 * Serializes a User document into a safe public/API DTO without passwordHash or tokenVersion.
 */
export const serializeUser = (user) => {
  const dto = {
    id: String(user._id ?? user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.isActive),
    preferences: user.preferences ? { ...DEFAULT_PREFERENCES, ...user.preferences.toObject?.() ?? user.preferences } : { ...DEFAULT_PREFERENCES },
    createdAt: user.createdAt,
  };

  if (user.rollNo !== undefined && user.rollNo !== null && user.rollNo !== '') {
    dto.rollNo = user.rollNo;
  }

  return dto;
};

export default mongoose.model('User', userSchema);
