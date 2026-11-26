# Backend Architecture & Specification (`BACKEND.md`)

This document defines the backend technical architecture, MongoDB schemas, REST API routes, middleware pipeline, and environment configuration. The Backend engineer can build, test, and containerize the service completely independently using this specification.

---

## 1. Architecture Overview

- **Runtime & Framework**: **Node.js** (v20+) with **Express 4.x** in ES Module (`"type": "module"`) format.
- **Database**: **MongoDB** accessed via **Mongoose 8.x** with schema validation, pre-save hashing hooks, and indexing.
- **Authentication**: Stateless JSON Web Tokens (**JWT**) with salted **bcrypt** password hashing (12 rounds).
- **Security Middleware**: `helmet`, `cors`, `express-rate-limit`, and custom NoSQL sanitization.
- **Architecture Pattern**: Controller-Service-Model modular architecture with centralized async error handling.

---

## 2. Directory Structure & Boundaries

```
backend/
├── src/
│   ├── config/
│   │   └── db.js            # Mongoose connection & connection retry logic
│   ├── controllers/
│   │   └── authController.js# Registration, login, and profile fetching handlers
│   ├── middleware/
│   │   ├── authMiddleware.js# JWT verification & role authorization (protect, authorize)
│   │   ├── errorMiddleware.js# 404 handler and global exception handler (zero stack traces in prod)
│   │   └── rateLimitMiddleware.js # Rate limiters for auth endpoints
│   ├── models/
│   │   └── User.js          # User schema, bcrypt pre-save hook, and comparePassword method
│   ├── routes/
│   │   ├── authRoutes.js    # /api/auth route definitions
│   │   └── healthRoutes.js  # /api/health monitoring endpoint
│   ├── utils/
│   │   ├── generateToken.js # Signs JWT tokens with expiry
│   │   └── validateEnv.js   # Verifies all critical env vars are loaded before booting
│   └── server.js            # Express app assembly & listener
├── .env.example             # Backend template environment file
└── package.json             # Backend dependencies and startup scripts
```

---

## 3. Environment Variables Specification (`.env.example`)

Before running the server, copy `.env.example` to `.env` and supply valid values:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection (MongoDB Atlas or Local MongoDB)
MONGO_URI=mongodb://localhost:27017/technoverse

# JWT Authentication Secrets
JWT_SECRET=replace_with_a_secure_random_64_character_string_here
JWT_EXPIRES_IN=7d

# CORS Allowed Origin (Frontend URL)
CLIENT_URL=http://localhost:5173
```

> [!CAUTION]
> The server must check that `MONGO_URI` and `JWT_SECRET` are defined at startup. If either is missing, the server must fail immediately with a descriptive error.

---

## 4. MongoDB Models & Schemas

### `User` Model (`src/models/User.js`)
```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save bcrypt hashing hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password instance method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
```

---

## 5. Security & Middleware Pipeline

1. **Security Headers**:
   ```javascript
   app.use(helmet());
   ```
2. **CORS Control**:
   ```javascript
   app.use(cors({
     origin: process.env.CLIENT_URL || 'http://localhost:5173',
     credentials: true,
   }));
   ```
3. **Payload Limit**:
   ```javascript
   app.use(express.json({ limit: '10kb' }));
   ```
4. **Rate Limiting**:
   - `authLimiter`: 5 requests per 1 minute window per IP for `/api/auth/login` and `/api/auth/register`.
5. **Auth Middleware (`protect`)**:
   - Extracts Bearer token from `req.headers.authorization`.
   - Verifies JWT using `process.env.JWT_SECRET`.
   - Fetches user without password: `User.findById(decoded.id).select('-password')`.
   - Attaches user to `req.user`.
6. **Error Handling**:
   - 404 handler for unmatched routes.
   - Global error middleware: Returns `{ success: false, message: err.message }` with HTTP status code (400, 401, 403, 404, 500). In production (`NODE_ENV === 'production'`), omit stack traces entirely.

---

## 6. REST API Routes & Contract

### A. Health Monitoring
- **`GET /api/health`**
  - **Access**: Public
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "status": "healthy",
      "timestamp": "2026-11-27T00:00:00.000Z",
      "uptime": 124.5
    }
    ```

### B. Authentication Routes (`/api/auth`)
- **`POST /api/auth/register`**
  - **Access**: Public (Rate-limited)
  - **Body**: `{ "name": "Alice", "email": "alice@example.com", "password": "password123" }`
  - **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "User registered successfully",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "data": {
        "user": {
          "id": "6745f412...",
          "name": "Alice",
          "email": "alice@example.com",
          "role": "user"
        }
      }
    }
    ```
- **`POST /api/auth/login`**
  - **Access**: Public (Rate-limited)
  - **Body**: `{ "email": "alice@example.com", "password": "password123" }`
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1Ni...",
      "data": {
        "user": {
          "id": "6745f412...",
          "name": "Alice",
          "email": "alice@example.com",
          "role": "user"
        }
      }
    }
    ```
- **`GET /api/auth/me`**
  - **Access**: Protected (`Authorization: Bearer <token>`)
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "6745f412...",
          "name": "Alice",
          "email": "alice@example.com",
          "role": "user"
        }
      }
    }
    ```

---

## 7. Decoupled Handoff & Testing

- The `backend/` folder is 100% self-contained. It contains its own `package.json` and `.env.example`.
- To hand off to a backend teammate:
  1. Zip the `backend/` folder along with `BACKEND.md` and `SECURITY.md`.
  2. The teammate runs `npm install`, creates `.env` from `.env.example`, and runs `npm run dev`.
  3. All routes can be tested immediately using Postman, Thunder Client, or cURL without requiring the frontend to be running.
