import path from "path";
import { hasGoogleClients, withGoogleClient } from "../config/google.js";
import { logModeration } from "./activityLogService.js";

const FALLBACK_TRANSCRIPT = "Voice message received. Transcription is currently unavailable.";

export async function transcribeAudio(filePath) {
  if (!hasGoogleClients()) {
    return FALLBACK_TRANSCRIPT;
  }

  try {
    const response = await withGoogleClient(async ({ client }) => {
      const uploadedFile = await client.files.upload({
        file: filePath,
        config: {
          mimeType: "audio/webm",
          displayName: path.basename(filePath)
        }
      });

      return client.models.generateContent({
        model: process.env.GOOGLE_TRANSCRIPTION_MODEL || "gemini-2.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Transcribe this audio verbatim. Return only the transcript text with no introduction."
              },
              {
                fileData: {
                  fileUri: uploadedFile.uri,
                  mimeType: uploadedFile.mimeType
                }
              }
            ]
          }
        ]
      });
    });

    return response.text?.trim() || FALLBACK_TRANSCRIPT;
  } catch (error) {
    logModeration("transcription_provider_fallback", {
      provider: "google-gemini-audio",
      reason: error.message
    });

    return FALLBACK_TRANSCRIPT;
  }
}
