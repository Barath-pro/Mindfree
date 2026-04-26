import { asyncHandler } from "../utils/asyncHandler.js";
import { loginUser, loginWithGoogle, registerUser } from "../services/authService.js";

export const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);
  res.status(201).json({ success: true, ...result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);
  res.status(200).json({ success: true, ...result });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const result = await loginWithGoogle(req.body);
  res.status(200).json({ success: true, ...result });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user.toSafeObject()
  });
});
