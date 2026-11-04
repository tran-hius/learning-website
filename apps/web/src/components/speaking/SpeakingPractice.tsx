"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitSpeakingAttempt } from "@/lib/api/english";
import { friendlyApiMessage } from "@/lib/api/client";
import type { SpeakingAttemptResult } from "@/lib/api/english";
import { cn } from "@/lib/utils";

/**
 * Luyện nói (S_E1, contract mục 8) — task TASK-004-FR mục 2.
 * - Nút mic tròn to ≥56px (guide mục 7), MediaRecorder ghi âm + waveform đơn giản.
 * - Phát lại bản ghi vừa ghi so với audio mẫu, nộp qua S_E1 (multipart).
 * - MVP: similarityHint COMPARE_MANUALLY → tự chấm 1–5 + lưu local "đã luyện".
 * - Lỗi xin quyền mic / ghi âm → thông báo thân thiện, không chết UI.
 */

export interface SpeakingPracticeProps {
  setId: string | null;
  isDemo: boolean;
  /** Payload của practice set: audio mẫu + đề bài nói. */
  modelAudioUrl: string;
  prompt: string;
}

const MAX_SECONDS = 30; // contract S_E1: tối đa 30 giây

export function SpeakingPractice({ setId, isDemo, modelAudioUrl, prompt }: SpeakingPracticeProps) {
  const [micError, setMicError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SpeakingAttemptResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [savedLocally, setSavedLocally] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // FE-3 (TASK-005): notice demo tách khỏi lỗi thật — banner honey trung tính
  // (pattern `usedFallback` của ListeningPlayer), không dùng role="alert" đỏ.
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // FE-4 (TASK-005): giữ AudioContext để close() trong cleanup, tránh rò rỉ.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Đọc trạng thái "đã luyện" từ lần trước (localStorage theo task).
  useEffect(() => {
    if (!setId) return;
    try {
      setSavedLocally(localStorage.getItem(`speaking-practiced:${setId}`) === "1");
    } catch {
      /* localStorage có thể bị chặn — bỏ qua */
    }
  }, [setId]);

  /** Waveform đơn giản: vẽ thanh theo amplitude từ AnalyserNode. */
  function drawWaveform() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 32;
    const step = Math.floor(data.length / bars);
    ctx.fillStyle = "#4DB6AC";
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(data[i * step] - 128) / 128;
      const h = Math.max(3, v * canvas.height);
      ctx.fillRect(i * (canvas.width / bars) + 2, (canvas.height - h) / 2, canvas.width / bars - 4, h);
    }
    rafRef.current = requestAnimationFrame(drawWaveform);
  }

  function cleanupRecording() {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    // FE-4: đóng AudioContext để giải phóng tài nguyên audio.
    void audioCtxRef.current?.close().catch(() => {
      /* close lỗi → bỏ qua, đã cleanup hết các thứ khác */
    });
    audioCtxRef.current = null;
  }

  useEffect(() => cleanupRecording, []);

  async function startRecording() {
    setMicError(null);
    if (typeof MediaRecorder === "undefined") {
      setMicError("Trình duyệt này chưa hỗ trợ ghi âm — thử Chrome hoặc Edge nhé!");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Waveform: AudioContext + Analyser (tạo sau khi có stream).
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      rafRef.current = requestAnimationFrame(drawWaveform);

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordedUrl(URL.createObjectURL(blob));
        setRecording(false);
        cleanupRecording();
      };
      recorder.start();
      setRecording(true);
      setElapsed(0);
      // Tự dừng sau 30s (giới hạn S_E1).
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s + 1 >= MAX_SECONDS) recorderRef.current?.stop();
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      cleanupRecording();
      setRecording(false);
      const denied = typeof err === "object" && err !== null && "name" in err && (err as { name?: string }).name === "NotAllowedError";
      setMicError(
        denied
          ? "Bạn chưa cho phép dùng mic — mở quyền truy cập mic rồi thử lại nha!"
          : "Không ghi âm được, kiểm tra mic rồi thử lại nhé!",
      );
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function handleSubmit() {
    if (!recordedUrl) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const blob = await (await fetch(recordedUrl)).blob();
      const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("mp4") ? "m4a" : "mp3";
      const audio = new File([blob], `speaking-${Date.now()}.${ext}`, { type: blob.type || "audio/webm" });
      if (audio.size > 3 * 1024 * 1024) {
        setSubmitError("Bản ghi hơi nặng quá 3MB — thu ngắn lại một chút nhé!");
        return;
      }
      if (isDemo || !setId) {
        // Demo trung thực: không gọi S_E1 — báo rõ bản ghi chỉ nằm trên máy.
        setResult({
          storedUrl: "",
          modelAudioUrl,
          similarityHint: "COMPARE_MANUALLY",
          selfScoreOptions: [1, 2, 3, 4, 5],
        });
        setDemoNotice("Chế độ demo — bản ghi chỉ nghe trên máy này, chưa gửi lên server.");
      } else {
        setResult(await submitSpeakingAttempt({ audio, modelAudioUrl, prompt }));
      }
    } catch (err) {
      setSubmitError(friendlyApiMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function saveSelfScore(score: number) {
    setSelfScore(score);
    if (!setId) return;
    try {
      localStorage.setItem(`speaking-practiced:${setId}`, "1");
      localStorage.setItem(`speaking-self-score:${setId}`, String(score));
      setSavedLocally(true);
    } catch {
      /* localStorage chặn → bỏ qua */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-5 text-honey-500" aria-hidden /> Luyện nói
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-[15px] text-ink-700">{prompt}</p>
        {micError ? (
          <p role="alert" className="rounded-[12px] bg-coral-50 px-4 py-3 text-sm text-coral-600">
            {micError}
          </p>
        ) : null}

        {/* Nút mic tròn to (≥56px) + waveform khi ghi */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            aria-label={recording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
            aria-pressed={recording}
            className={cn(
              "flex size-16 items-center justify-center rounded-full text-white transition-transform duration-200 ease-out outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500",
              recording
                ? "bg-coral-500 hover:bg-coral-600 animate-pop-in"
                : "bg-honey-400 text-ink-900 hover:bg-honey-500 hover:scale-105",
            )}
          >
            {recording ? <Square className="size-6" aria-hidden /> : <Mic className="size-7" aria-hidden />}
          </button>
          <span className="text-sm text-ink-700" aria-live="polite">
            {recording ? `Đang ghi… ${elapsed}s / ${MAX_SECONDS}s` : "Bấm mic để thu giọng của bạn"}
          </span>
          <canvas
            ref={canvasRef}
            width={280}
            height={48}
            className={cn("rounded-[10px] bg-cream-deep", recording ? "opacity-100" : "opacity-30")}
            aria-hidden
          />
        </div>

        {/* Phát lại: bản ghi vs audio mẫu */}
        {recordedUrl ? (
          <div className="flex flex-col gap-3 rounded-[12px] bg-cream-deep p-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-900">Bản ghi của bạn</span>
              <audio controls preload="metadata" src={recordedUrl} className="w-full" />
            </div>
            {modelAudioUrl ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-ink-900">Audio mẫu — nghe so lại nè</span>
                <audio controls preload="metadata" src={modelAudioUrl} className="w-full" />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Nộp S_E1 + tự chấm 1–5 (COMPARE_MANUALLY) */}
        {recordedUrl && !result ? (
          <Button onClick={handleSubmit} disabled={submitting} className="self-start">
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Nộp bản ghi
          </Button>
        ) : null}

        {submitError ? (
          <p role="alert" className="rounded-[12px] bg-coral-50 px-4 py-3 text-sm text-coral-600">
            {submitError}
          </p>
        ) : null}

        {demoNotice ? (
          <p className="rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-3 text-sm text-ink-700">
            {demoNotice}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-3 rounded-[12px] bg-mint-100 px-4 py-3">
            <p className="text-sm font-medium text-mint-600">
              Đã nhận bản ghi — MVP chưa chấm tự động, bạn tự nghe lại và tự đánh giá nhé!
            </p>
            <div role="group" aria-label="Tự đánh giá 1 đến 5" className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-700">Tự chấm:</span>
              {(result.selfScoreOptions ?? [1, 2, 3, 4, 5]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => saveSelfScore(s)}
                  aria-pressed={selfScore === s}
                  className={cn(
                    "min-h-[44px] min-w-[44px] rounded-[10px] text-sm font-semibold transition-colors duration-200 ease-out",
                    selfScore === s
                      ? "bg-honey-400 text-ink-900"
                      : "bg-paper text-ink-700 hover:bg-honey-50",
                  )}
                >
                  {s}
                </button>
              ))}
              <span className="text-sm text-ink-700">/ 5</span>
            </div>
            {selfScore !== null ? (
              <p className="flex items-center gap-2 text-sm font-medium text-mint-600">
                <Check className="size-4" aria-hidden />
                {savedLocally ? "Đã lưu " : "Đã ghi nhận "}bạn tự chấm {selfScore}/5 — luyện đều đều nha! 💪
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
