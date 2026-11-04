import { v2 as cloudinary } from "cloudinary";
import { appEnv } from "../config";
import { AppError } from "./errors";
import { logger } from "./logger";

/**
 * Cloudinary upload helper (TASK-004, S_E1).
 * Env trống → throw 503 SERVICES_NOT_CONFIGURED theo yêu cầu task.
 */

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    appEnv.CLOUDINARY_CLOUD_NAME && appEnv.CLOUDINARY_API_KEY && appEnv.CLOUDINARY_API_SECRET,
  );
}

export async function uploadAudioBuffer(
  buffer: Uint8Array,
  filename: string,
): Promise<{ url: string; bytes: number }> {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      "SERVICES_NOT_CONFIGURED",
      "Audio upload is not configured (missing Cloudinary credentials)",
      503,
    );
  }
  cloudinary.config({
    cloud_name: appEnv.CLOUDINARY_CLOUD_NAME,
    api_key: appEnv.CLOUDINARY_API_KEY,
    api_secret: appEnv.CLOUDINARY_API_SECRET,
  });
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video", // Cloudinary lưu audio dưới resource_type "video"
        folder: "synapsebrain/speaking",
        public_id: filename.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_"),
      },
      (err, result) => {
        if (err) {
          logger.error({ err }, "Cloudinary upload failed");
          reject(new AppError("INTERNAL", "Audio upload failed", 500));
          return;
        }
        if (!result) {
          reject(new AppError("INTERNAL", "Audio upload failed", 500));
          return;
        }
        resolve({ url: result.secure_url, bytes: result.bytes ?? buffer.byteLength });
      },
    );
    stream.end(buffer);
  });
}
