import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";
import { uploadAudioBuffer, isCloudinaryConfigured } from "../utils/cloudinary";
import { ContentRepository } from "../repositories";
import { EnglishRepository } from "../repositories/english.repository";
import { serializeQuestionsForStudent } from "../utils/question-serializer";

/**
 * English service — contract mục 8 (S_E1/S_E2), TASK-004.
 * S_E1: MVP chỉ lưu bản ghi + so sánh thủ công; chấm AI để Phase 2.
 * S_E2: metadata audio + playbackSpeedOptions; transcript MVP trả luôn kèm
 *       `lockedUntilSubmit` theo payload của practice set (quyết định task).
 */

/** Tốc độ phát client tự điều khiển (audio.playbackRate) — contract mục 8. */
export const PLAYBACK_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const SELF_SCORE_OPTIONS = [1, 2, 3, 4, 5];

const MAX_AUDIO_BYTES = 3 * 1024 * 1024; // 3MB

/** Magic bytes đơn giản: mp3 (ID3 / frame sync), m4a/mp4 (ftyp), wav (RIFF). */
export function looksLikeAudio(mimetype: string, buffer: Uint8Array): boolean {
  if (!mimetype.startsWith("audio/") && mimetype !== "video/mp4") return false;
  if (buffer.length < 12) return false;
  const ascii = (offset: number, text: string) =>
    Buffer.from(buffer.slice(offset, offset + text.length)).toString("latin1") === text;
  const isMp3Frame =
    buffer[0] === 0xff && buffer[1] !== undefined && (buffer[1] & 0xe0) === 0xe0; // MPEG frame sync
  return (
    ascii(0, "ID3") ||
    ascii(4, "ftyp") ||
    ascii(0, "RIFF") ||
    ascii(0, "OggS") ||
    ascii(0, "fLaC") ||
    isMp3Frame
  );
}

export type SpeakingUpload = {
  mimetype: string;
  size: number;
  buffer: Uint8Array;
  originalname?: string;
};

export class EnglishService {
  constructor(
    private readonly content: ContentRepository = new ContentRepository(),
    private readonly english: EnglishRepository = new EnglishRepository(),
  ) {}

  /** S_E1: POST /english/speaking/attempt (multipart). */
  async createSpeakingAttempt(
    userId: string,
    body: { modelAudioUrl: string; prompt: string },
    file: SpeakingUpload | undefined,
  ) {
    if (!file) {
      throw new AppError("VALIDATION_ERROR", "audio file is required", 422);
    }
    if (file.size > MAX_AUDIO_BYTES) {
      throw new AppError("VALIDATION_ERROR", "audio must be at most 3MB", 422);
    }
    if (!looksLikeAudio(file.mimetype, file.buffer)) {
      throw new AppError("VALIDATION_ERROR", "audio content-type or format is not supported", 422);
    }
    if (!isCloudinaryConfigured()) {
      // Env trống → lỗi rõ ràng 503 (task yêu cầu), không upload dở dang.
      throw new AppError(
        "SERVICES_NOT_CONFIGURED",
        "Audio upload is not configured (missing Cloudinary credentials)",
        503,
      );
    }

    const filename = `${userId}-${Date.now()}-${(file.originalname ?? "audio.mp3").slice(-40)}`;
    const uploaded = await uploadAudioBuffer(file.buffer, filename);
    logger.info({ userId, bytes: uploaded.bytes }, "speaking attempt uploaded");

    const attempt = await this.english.createSpeakingAttempt({
      userId,
      prompt: body.prompt,
      audioUrl: uploaded.url,
      modelAudioUrl: body.modelAudioUrl,
    });

    return {
      storedUrl: attempt.audioUrl,
      modelAudioUrl: attempt.modelAudioUrl,
      similarityHint: "COMPARE_MANUALLY" as const,
      selfScoreOptions: SELF_SCORE_OPTIONS,
    };
  }

  /** S_E2: GET /english/listening/:resourceId (resourceId = practice set id). */
  async getListeningResource(resourceId: string) {
    const set = await this.content.findPracticeSetById(resourceId);
    if (!set || set.mode !== "LISTENING") {
      throw new AppError("NOT_FOUND", "Listening resource not found", 404);
    }
    const payload = (set.payload ?? {}) as {
      audioUrl?: string;
      title?: string;
      transcript?: string;
      lockedUntilSubmit?: boolean;
    };
    if (!payload.audioUrl) {
      throw new AppError("NOT_FOUND", "Listening resource has no audio", 404);
    }
    return {
      resourceId: set.id,
      title: payload.title ?? null,
      audioUrl: payload.audioUrl,
      playbackSpeedOptions: PLAYBACK_SPEED_OPTIONS,
      // MVP: trả transcript luôn, kèm flag để frontend gate theo payload.
      transcript: payload.transcript ?? null,
      lockedUntilSubmit: payload.lockedUntilSubmit ?? true,
      // Câu hỏi ẨN đáp án khi làm bài (contract mục 3.2).
      questions: serializeQuestionsForStudent(set.questions),
    };
  }
}
