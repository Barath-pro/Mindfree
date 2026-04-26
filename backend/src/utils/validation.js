import { validationResult } from "express-validator";
import { ApiError } from "./ApiError.js";

export function handleValidation(req, _res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new ApiError(400, "Validation failed", errors.array()));
  }

  next();
}

