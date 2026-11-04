/**
 * English đặc thù (nghe – nói) — contract mục 8 (S_E1/S_E2) của docs/api-contract.md.
 * Backend đã mount (TASK-004): GET /english/listening/:resourceId,
 * POST /english/speaking/attempt (multipart).
 * Shape type khai báo cục bộ tại đây khớp apps/api/src/services/english.service.ts
 * (không sửa packages/shared — ngoài phạm vi task).
 */
import { apiFetch } from "./client";
import type { QuestionPublic } from "./types";

/** S_E2 — GET /english/listening/:resourceId (resourceId = practice set id). */
export interface ListeningResource {
  resourceId: string;
  title: string | null;
  audioUrl: string;
  playbackSpeedOptions: number[];
  transcript: string | null;
  lockedUntilSubmit: boolean;
  questions: QuestionPublic[];
}

export function getListeningResource(resourceId: string): Promise<ListeningResource> {
  return apiFetch<ListeningResource>(
    `/english/listening/${encodeURIComponent(resourceId)}`,
  );
}

/** S_E1 — POST /english/speaking/attempt (multipart, audio ≤ 3MB). */
export interface SpeakingAttemptResult {
  storedUrl: string;
  modelAudioUrl: string;
  similarityHint: "COMPARE_MANUALLY";
  selfScoreOptions: number[];
}

export function submitSpeakingAttempt(input: {
  audio: File;
  modelAudioUrl: string;
  prompt: string;
}): Promise<SpeakingAttemptResult> {
  const form = new FormData();
  form.append("audio", input.audio);
  form.append("modelAudioUrl", input.modelAudioUrl);
  form.append("prompt", input.prompt);
  return apiFetch<SpeakingAttemptResult>("/english/speaking/attempt", {
    method: "POST",
    formData: form,
  });
}
