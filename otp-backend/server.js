import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Temporary in-memory OTP storage.
// Later, if needed, this can be moved to a database/Redis.
const otpStore = new Map();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate a secure 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

// Send OTP
app.post("/api/otp/send", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otp = generateOTP();

    // OTP valid for 5 minutes
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      attempts: 0,
    });

    await transporter.sendMail({
      from: `"MolRAG-DDI" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
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

          <p>This OTP will expire in <strong>5 minutes</strong>.</p>

          <p style="color: #64748B; font-size: 13px;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully.",
    });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send OTP.",
    });
  }
});

// Verify OTP
app.post("/api/otp/verify", (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const record = otpStore.get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        message: "No OTP found. Please request a new OTP.",
      });
    }

    // Check expiry
    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);

      return res.status(400).json({
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Limit incorrect attempts
    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);

      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    if (String(otp).trim() !== record.otp) {
      record.attempts += 1;

      return res.status(400).json({
        message: "Incorrect OTP.",
      });
    }

    // OTP is correct
    otpStore.delete(normalizedEmail);

    return res.json({
      success: true,
      verified: true,
      message: "Email verified successfully.",
    });

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify OTP.",
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "MolRAG-DDI OTP server is running.",
  });
});

app.listen(PORT, () => {
  console.log(`OTP server running on http://localhost:${PORT}`);
});