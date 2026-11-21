
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";
import dns from "node:dns";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "node:stream";

// DNS configuration
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDist = path.resolve(__dirname, "../frontend/dist");

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Python FastAPI backend
const PYTHON_BACKEND =
  "https://molrag-ddi-backend.onrender.com";

// =====================================================
// PYTHON BACKEND PROXY
// =====================================================

// Keep Node authentication and health routes local.
// Forward all other /api requests to FastAPI.
app.use(async (req, res, next) => {
  const isApiRequest = req.path.startsWith("/api/");

  const isNodeRoute =
    req.path === "/api/health" ||
    req.path.startsWith("/api/otp/") ||
    req.path.startsWith("/api/auth/");

  if (!isApiRequest || isNodeRoute) {
    return next();
  }

  try {
    let targetPath = req.originalUrl;

    // Provide a separate health endpoint for Python.
    if (req.path === "/api/backend-health") {
      targetPath = "/api/health";
    }

    const targetUrl = `${PYTHON_BACKEND}${targetPath}`;

    const headers = { ...req.headers };

    // Remove headers that should not be forwarded.
    delete headers.host;
    delete headers.connection;
    delete headers["content-length"];
    delete headers["transfer-encoding"];

    const options = {
      method: req.method,
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(300000)
    };

    // Forward the original request body without parsing it.
    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = req;
      options.duplex = "half";
    }

    console.log("Forwarding API request:", req.method, targetUrl);

    const backendResponse = await fetch(targetUrl, options);

    res.status(backendResponse.status);

    // Forward response headers.
    backendResponse.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();

      if (
        lowerKey !== "transfer-encoding" &&
        lowerKey !== "connection" &&
        lowerKey !== "content-encoding" &&
        lowerKey !== "content-length"
      ) {
        res.setHeader(key, value);
      }
    });

    // Stream the response back to the frontend.
    if (req.method === "HEAD" || !backendResponse.body) {
      return res.end();
    }

    Readable.fromWeb(backendResponse.body).pipe(res);

  } catch (error) {
    console.error("Python backend proxy error:", error);

    if (!res.headersSent) {
      return res.status(502).json({
        success: false,
        message: "Python backend is temporarily unavailable.",
        error: error.name === "TimeoutError"
          ? "Backend request timed out."
          : "Unable to connect to Python backend."
      });
    }

    res.end();
  }
});

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// Serve React frontend
app.use(express.static(frontendDist));

// =====================================================
// MONGODB CONFIGURATION
// =====================================================

let mongoClient = null;
let usersCollection = null;

async function connectDB() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not configured.");
  }

  mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();

  const db = mongoClient.db("molrag_ddi");
  usersCollection = db.collection("users");

  await usersCollection.createIndex(
    { email: 1 },
    { unique: true }
  );

  console.log("Connected to MongoDB.");
}

// Database availability
function requireDatabase(res) {
  if (!usersCollection) {
    res.status(503).json({
      success: false,
      message: "Database is currently unavailable."
    });

    return false;
  }

  return true;
}

// JWT availability
function requireJWT(res) {
  if (!JWT_SECRET) {
    res.status(503).json({
      success: false,
      message: "Authentication is not configured."
    });

    return false;
  }

  return true;
}

// =====================================================
// OTP CONFIGURATION
// =====================================================

const otpStore = new Map();
const VERIFIED_WINDOW_MS = 10 * 60 * 1000;

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// =====================================================
// RESEND EMAIL FUNCTION
// =====================================================

async function sendOTPEmail(email, otp) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const sender =
    process.env.RESEND_FROM_EMAIL ||
    "MolRAG-DDI <onboarding@resend.dev>";

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: sender,
        to: [email],
        subject: "Your MolRAG-DDI Verification Code",
        text: `Your MolRAG-DDI verification code is ${otp}. This code expires in 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
            <h2 style="color: #0F2A43;">MolRAG-DDI</h2>
            <p>Your email verification code is:</p>

            <div style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 25px 0;
              color: #0E7C86;
            ">
              ${otp}
            </div>

            <p>This OTP expires in <strong>5 minutes</strong>.</p>

            <p style="color: #64748B; font-size: 13px;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </div>
        `
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("RESEND API ERROR:", data);

    throw new Error(
      data.message || "Unable to send verification email."
    );
  }

  console.log("OTP email sent successfully:", data.id);

  return data;
}

// =====================================================
// NODE HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "MolRAG-DDI server is running.",
    database: usersCollection ? "connected" : "unavailable",
    emailProvider: RESEND_API_KEY ? "configured" : "unavailable"
  });
});

// =====================================================
// OTP: SEND
// =====================================================

app.post("/api/otp/send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required."
      });
    }

    if (!RESEND_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "Email service is not configured."
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const otp = generateOTP();

    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      attempts: 0,
      verified: false
    });

    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      otpStore.delete(normalizedEmail);
      throw emailError;
    }

    return res.json({
      success: true,
      message: "OTP sent successfully."
    });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to send OTP."
    });
  }
});

// =====================================================
// OTP: VERIFY
// =====================================================

app.post("/api/otp/verify", (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required."
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP."
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP."
      });
    }

    if (String(otp).trim() !== record.otp) {
      record.attempts++;

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP."
      });
    }

    record.verified = true;
    record.expiresAt = Date.now() + VERIFIED_WINDOW_MS;

    return res.json({
      success: true,
      verified: true,
      message: "Email verified successfully."
    });

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP."
    });
  }
});

// =====================================================
// AUTH: REGISTER
// =====================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    if (!requireDatabase(res)) return;
    if (!requireJWT(res)) return;

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const record = otpStore.get(normalizedEmail);

    if (
      !record ||
      !record.verified ||
      Date.now() > record.expiresAt
    ) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please verify your OTP before registering."
      });
    }

    const existing = await usersCollection.findOne({
      email: normalizedEmail
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await usersCollection.insertOne({
      email: normalizedEmail,
      name: name || null,
      passwordHash,
      createdAt: new Date()
    });

    otpStore.delete(normalizedEmail);

    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        email: normalizedEmail
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        email: normalizedEmail,
        name: name || null
      }
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register."
    });
  }
});

// =====================================================
// AUTH: LOGIN
// =====================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!requireDatabase(res)) return;
    if (!requireJWT(res)) return;

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await usersCollection.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const match = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: normalizedEmail
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: {
        email: normalizedEmail,
        name: user.name || null
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in."
    });
  }
});

// =====================================================
// AUTH: RESET PASSWORD
// =====================================================

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    if (!requireDatabase(res)) return;
    if (!requireJWT(res)) return;

    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required."
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters."
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const record = otpStore.get(normalizedEmail);

    if (
      !record ||
      !record.verified ||
      Date.now() > record.expiresAt
    ) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please verify your OTP before resetting your password."
      });
    }

    const user = await usersCollection.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email."
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await usersCollection.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          passwordHash,
          updatedAt: new Date()
        }
      }
    );

    otpStore.delete(normalizedEmail);

    return res.json({
      success: true,
      message: "Password updated successfully."
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password."
    });
  }
});

// =====================================================
// REACT ROUTER FALLBACK
// =====================================================

app.use((req, res, next) => {
  if (
    req.method !== "GET" ||
    req.path.startsWith("/api/")
  ) {
    return next();
  }

  res.sendFile(
    path.join(frontendDist, "index.html"),
    (error) => {
      if (error) next(error);
    }
  );
});

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    if (MONGO_URI) {
      await connectDB();
    } else {
      console.warn("MongoDB URI not configured.");
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.warn("Starting frontend without database connectivity.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MolRAG-DDI running on port ${PORT}`);
  });
}

startServer();
