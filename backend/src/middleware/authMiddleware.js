import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyToken } from "../utils/token.js";

function getBearerToken(header = "") {
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7);
}

export async function requireAuth(req, _res, next) {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      throw new ApiError(401, "Authorization token missing");
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);

    if (!user) {
      throw new ApiError(401, "Invalid token");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid token"));
  }
}

export async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      throw new ApiError(401, "Socket authentication required");
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);

    if (!user) {
      throw new ApiError(401, "Invalid token");
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error(error.message || "Unauthorized"));
  }
}

