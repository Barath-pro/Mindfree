import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../utils/ApiError.js";
import { getGoogleAuthClientIds } from "../config/env.js";
import { User } from "../models/User.js";
import { generateToken } from "../utils/token.js";

const googleAuthClient = new OAuth2Client();

export async function registerUser({ fullName, email, password, role }) {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ fullName, email, passwordHash, role });

  return {
    token: generateToken({ sub: user._id.toString(), role: user.role }),
    user: user.toSafeObject()
  };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid credentials");
  }

  return {
    token: generateToken({ sub: user._id.toString(), role: user.role }),
    user: user.toSafeObject()
  };
}

export async function loginWithGoogle({ credential, role = "patient" }) {
  const audiences = getGoogleAuthClientIds();

  if (audiences.length === 0) {
    throw new ApiError(500, "Google sign-in is not configured on the server.");
  }

  const ticket = await googleAuthClient.verifyIdToken({
    idToken: credential,
    audience: audiences
  });
  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new ApiError(401, "Google sign-in did not return a valid email address.");
  }

  let user = await User.findOne({ email: payload.email.toLowerCase() });

  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);

    user = await User.create({
      fullName: payload.name || payload.email.split("@")[0],
      email: payload.email.toLowerCase(),
      passwordHash,
      role
    });
  }

  return {
    token: generateToken({ sub: user._id.toString(), role: user.role }),
    user: user.toSafeObject()
  };
}
