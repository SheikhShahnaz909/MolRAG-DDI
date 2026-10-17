import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient } from "mongodb";
import dns from "node:dns";

// Node's built-in DNS resolver can pick a different (sometimes unreachable)
// nameserver than the OS-level one nslookup uses -- especially on Windows
// machines with multiple network adapters (VPN, virtual, etc). Forcing
// known-good public DNS servers here fixes "querySrv ECONNREFUSED" errors
// when resolving mongodb+srv:// connection strings.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;

if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set in otp-backend/.env");
  process.exit(1);
}
if (!MONGO_URI) {
  console.error("FATAL: MONGO_URI is not set in otp-backend/.env");
  process.exit(1);
}

// ---- MongoDB connection (same 'molrag_ddi' database FastAPI uses) ----
const mongoClient = new MongoClient(MONGO_URI);
let usersCollection;

async function connectDB() {
  await mongoClient.connect();
  const db = mongoClient.db("molrag_ddi");
  usersCollection = db.collection("users");
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  console.log("otp-backend connected to MongoDB (molrag_ddi.users)");
}

// Temporary in-memory OTP storage.
// verified:false while pending; verified:true + short window after a
// successful /api/otp/verify call, so register/reset-password can trust it
// without requiring the OTP to be re-entered a second time.
const otpStore = new Map();
const VERIFIED_WINDOW_MS = 10 * 60 * 1000; // 10 minutes to complete register/reset after verifying

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// ============================================================
// OTP: send (unchanged behavior)
// ============================================================
app.post("/api/otp/send", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const normalizedEmail = normalizeEmail(email);
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(normalizedEmail, { otp, expiresAt, attempts: 0, verified: false });

    await transporter.sendMail({
      from: `"MolRAG-DDI" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject: "Your MolRAG-DDI Verification Code",
      text: `Your MolRAG-DDI verification code is ${otp}. This code expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
          <h2 style="color: #0F2A43;">MolRAG-DDI</h2>
          <p>Your email verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 25px 0; color: #0E7C86;">
            ${otp}
          </div>
          <p>This OTP will expire in <strong>5 minutes</strong>.</p>
          <p style="color: #64748B; font-size: 13px;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return res.json({ success: true, message: "OTP sent successfully." });
  } catch (error) {
    console.error("SEND OTP ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to send OTP." });
  }
});

// ============================================================
// OTP: verify
// On success, marks the record verified (instead of deleting it) so a
// follow-up /api/auth/register or /api/auth/reset-password call can use it.
// ============================================================
app.post("/api/otp/verify", (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const normalizedEmail = normalizeEmail(email);
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({ message: "No OTP found. Please request a new OTP." });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }
    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return res.status(429).json({ message: "Too many incorrect attempts. Please request a new OTP." });
    }
    if (String(otp).trim() !== record.otp) {
      record.attempts += 1;
      return res.status(400).json({ message: "Incorrect OTP." });
    }

    // Correct: mark verified, extend expiry into a short window for the next step
    record.verified = true;
    record.expiresAt = Date.now() + VERIFIED_WINDOW_MS;

    return res.json({ success: true, verified: true, message: "Email verified successfully." });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to verify OTP." });
  }
});

// ============================================================
// AUTH: register
// Requires a prior successful /api/otp/verify for this email.
// ============================================================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const normalizedEmail = normalizeEmail(email);
    const record = otpStore.get(normalizedEmail);

    if (!record || !record.verified || Date.now() > record.expiresAt) {
      return res.status(400).json({
        message: "Email not verified. Please verify your OTP before registering.",
      });
    }

    const existing = await usersCollection.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await usersCollection.insertOne({
      email: normalizedEmail,
      name: name || null,
      passwordHash,
      createdAt: new Date(),
    });

    otpStore.delete(normalizedEmail);

    const token = jwt.sign(
      { userId: result.insertedId.toString(), email: normalizedEmail },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Account created successfully.",
      token,
      user: { email: normalizedEmail, name: name || null },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to register." });
  }
});

// ============================================================
// AUTH: login
// ============================================================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await usersCollection.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: normalizedEmail },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: { email: normalizedEmail, name: user.name || null },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to log in." });
  }
});

// ============================================================
// AUTH: reset-password
// Requires a prior successful /api/otp/verify for this email.
// ============================================================
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const normalizedEmail = normalizeEmail(email);
    const record = otpStore.get(normalizedEmail);

    if (!record || !record.verified || Date.now() > record.expiresAt) {
      return res.status(400).json({
        message: "Email not verified. Please verify your OTP before resetting your password.",
      });
    }

    const user = await usersCollection.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await usersCollection.updateOne(
      { email: normalizedEmail },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    otpStore.delete(normalizedEmail);

    return res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({ success: false, message: "Unable to reset password." });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "MolRAG-DDI OTP/auth server is running." });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`OTP/auth server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("FATAL: Could not connect to MongoDB:", err);
    process.exit(1);
  });