import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import bcrypt from "bcryptjs";

export const getAllUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") throw new ApiError(403, "Admin only");
  const users = await User.find({ role: { $ne: "admin" } });
  res.status(200).json({ success: true, users: users.map((u) => u.toSafeObject()) });
});

export const removeSuspension = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") throw new ApiError(403, "Admin only");
  
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  
  user.isSuspended = false;
  user.warningCount = 0;
  user.tempBlockedUntil = null;
  await user.save();
  
  res.status(200).json({ success: true, user: user.toSafeObject() });
});

export const addUser = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") throw new ApiError(403, "Admin only");

  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password || !role) {
    throw new ApiError(400, "All fields are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(400, "User with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ fullName, email, passwordHash, role });

  res.status(201).json({ success: true, user: user.toSafeObject() });
});

export const removeUser = asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") throw new ApiError(403, "Admin only");

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json({ success: true, message: "User removed successfully" });
});
