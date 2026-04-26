import fs from "fs";
import path from "path";
import multer from "multer";

const uploadDirectory = path.resolve("src/uploads/voice");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`);
  }
});

function fileFilter(_req, file, cb) {
  if (!file.mimetype.startsWith("audio/")) {
    cb(new Error("Only audio files are allowed"));
    return;
  }

  cb(null, true);
}

export const uploadVoice = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_VOICE_FILE_SIZE || 10485760)
  }
});

