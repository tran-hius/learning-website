"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Ear,
  Eye,
  Loader2,
  Lock,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getListeningResource, type ListeningResource } from "@/lib/api/english";
import { submitPracticeAttempt } from "@/lib/api/practice";
import { friendlyApiMessage } from "@/lib/api/client";
import type { PracticeAttemptResult, QuestionPublic } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Player luyện nghe (S_E2, contract mục 8) — task TASK-004-FR mục 1.
 * - Tốc độ phát điều khiển client bằng audio.playbackRate (contract mục 8).
 * - Tua ±5s, lặp câu, transcript hiển thị theo `lockedUntilSubmit`.
 * - Dữ liệu thật: fetch S_E2 khi có setId; API lỗi → dùng payload kèm bài học
 *   (fallback trung thực, có ghi chú rõ — không fake như thật).
 */

export interface ListeningFallback {
  title?: string;
  audioUrl?: string;
  transcript?: string | null;
  lockedUntilSubmit?: boolean;
}

export interface ListeningPlayerProps {
  /** practice set id — null/demo → chỉ dùng fallback payload. */
  setId: string | null;
  isDemo: boolean;
  fallback: ListeningFallback;
}

const DEFAULT_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Định dạng giây -> m:ss. */
function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ListeningPlayer({ setId, isDemo, fallback }: ListeningPlayerProps) {
  const [resource, setResource] = useState<ListeningResource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [rate, setRate] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  // Trạng thái quiz nghe (LISTEN_MCQ) + transcript theo lockedUntilSubmit.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<PracticeAttemptResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const audioUrl = resource?.audioUrl ?? fallback.audioUrl ?? null;
  const title = resource?.title ?? fallback.title ?? null;
  const speeds = resource?.playbackSpeedOptions?.length
    ? resource.playbackSpeedOptions
    : DEFAULT_SPEEDS;
  const transcript = resource ? resource.transcript : (fallback.transcript ?? null);
  const locked = (resource ? resource.lockedUntilSubmit : (fallback.lockedUntilSubmit ?? true)) && !attempt;
  const questions: QuestionPublic[] = resource?.questions ?? [];

  useEffect(() => {
    if (!setId || isDemo) {
      setUsedFallback(!isDemo && !!fallback.audioUrl);
      return;
    }
    let alive = true;
    getListeningResource(setId)
      .then((data) => {
        if (alive) setResource(data);
      })
      .catch((err) => {
        if (!alive) return;
        if (fallback.audioUrl) {
          // Fallback trung thực: dùng payload kèm bài học + ghi chú rõ ràng.
          setUsedFallback(true);
        } else {
          setLoadError(friendlyApiMessage(err));
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, isDemo]);

  // Đổi tốc độ thật trên element audio (contract mục 8: client tự điều khiển).
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate, audioUrl]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => setLoadError("Trình duyệt chặn phát audio — thử bấm lại nha."));
    } else {
      el.pause();
    }
  }, []);

  const skip = useCallback((delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + delta), el.duration || el.currentTime + delta);
  }, []);

  async function handleSubmitAnswers() {
    if (!setId || isDemo) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitPracticeAttempt(setId, {
        answers: questions
          .map((q) => ({ questionId: q.id, value: answers[q.id] ?? "" }))
          .filter((a) => a.value !== ""),
      });
      setAttempt(result);
    } catch (err) {
      setSubmitError(friendlyApiMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError && !audioUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ear className="size-5 text-sky-500" aria-hidden /> Luyện nghe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p role="alert" className="rounded-[12px] bg-coral-50 px-4 py-3 text-sm text-coral-600">
            {loadError}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!audioUrl) return null;

  const answeredAll = questions.length > 0 && questions.every((q) => answers[q.id]);
  const resultByQuestion = new Map((attempt?.results ?? []).map((r) => [r.questionId, r]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ear className="size-5 text-sky-500" aria-hidden />
          Luyện nghe{title ? ` — ${title}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {usedFallback ? (
          <p className="rounded-[12px] border border-dashed border-honey-300 bg-honey-50 px-4 py-2.5 text-sm text-ink-700">
            Không tải được dữ liệu nghe mới từ máy chủ — tạm dùng audio kèm bài học, điểm chưa được
            ghi lại nha.
          </p>
        ) : null}

        <audio
          ref={audioRef}
          src={audioUrl}
          loop={loop}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        />

        {/* Hàng điều khiển: play + tua ±5s + loop */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="icon"
            onClick={togglePlay}
            aria-label={playing ? "Tạm dừng" : "Phát audio"}
            className="rounded-full"
          >
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => skip(-5)} aria-label="Tua lại 5 giây">
            <RotateCcw aria-hidden /> 5s
          </Button>
          <Button variant="outline" size="sm" onClick={() => skip(5)} aria-label="Tua tới 5 giây">
            <RotateCw aria-hidden /> 5s
          </Button>
          <Button
            variant={loop ? "default" : "outline"}
            size="sm"
            onClick={() => setLoop((v) => !v)}
            aria-pressed={loop}
          >
            <Repeat aria-hidden /> Lặp câu
          </Button>
          <span className="ml-auto font-mono text-sm text-ink-700" aria-label="Thời lượng">
            {fmt(current)} / {duration ? fmt(duration) : "--:--"}
          </span>
        </div>

        {/* Speed selector 0.5x – 2x */}
        <div
          role="group"
          aria-label="Tốc độ phát"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="text-sm text-ink-700">Tốc độ:</span>
          {speeds.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRate(s)}
              aria-pressed={rate === s}
              className={cn(
                "min-h-[36px] min-w-[48px] rounded-[10px] px-2 text-sm font-semibold transition-colors duration-200 ease-out",
                rate === s
                  ? "bg-sky-500 text-white"
                  : "bg-cream-deep text-ink-700 hover:text-ink-900",
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Quiz nghe (LISTEN_MCQ) — nộp P1 để mở transcript khi lockedUntilSubmit */}
        {questions.length > 0 && !attempt ? (
          <div className="flex flex-col gap-3 rounded-[12px] bg-cream-deep p-4">
            {questions.map((q) => (
              <fieldset key={q.id} className="flex flex-col gap-2">
                <legend className="text-[15px] font-semibold text-ink-900">{q.stem}</legend>
                {q.options.map((o) => {
                  const picked = answers[q.id] === o.id;
                  return (
                    <label
                      key={o.id}
                      className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[10px] bg-paper px-3 text-sm text-ink-700 transition-colors duration-200 hover:bg-honey-50"
                    >
                      <input
                        type="radio"
                        name={`listening-${q.id}`}
                        checked={picked}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: o.id }))}
                        className="accent-sky-500"
                      />
                      {o.content}
                    </label>
                  );
                })}
              </fieldset>
            ))}
            {submitError ? (
              <p role="alert" className="text-sm text-coral-600">
                {submitError}
              </p>
            ) : null}
            {setId && !isDemo ? (
              <Button
                size="sm"
                onClick={handleSubmitAnswers}
                disabled={!answeredAll || submitting}
                className="self-start bg-sky-500 hover:bg-sky-600"
              >
                {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                Nộp để mở transcript
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Kết quả chấm nghe (sau nộp) */}
        {attempt
          ? questions.map((q) => {
              const r = resultByQuestion.get(q.id);
              if (!r) return null;
              return (
                <p
                  key={q.id}
                  className={
                    r.isCorrect
                      ? "rounded-[12px] bg-mint-100 px-4 py-2.5 text-sm text-mint-600"
                      : "rounded-[12px] bg-coral-50 px-4 py-2.5 text-sm text-coral-600"
                  }
                >
                  {r.isCorrect ? "Chính xác! " : "Chưa đúng. "}
                  {r.explanation}
                </p>
              );
            })
          : null}

        {/* Transcript theo lockedUntilSubmit (contract S_E2) */}
        {transcript ? (
          locked ? (
            <p className="flex items-center gap-2 rounded-[12px] bg-cream-deep px-4 py-3 text-sm text-ink-700">
              <Lock className="size-4 shrink-0" aria-hidden />
              Transcript sẽ mở sau khi bạn nộp bài nghe nhé — nghe thật kỹ đã!
            </p>
          ) : (
            <details className="rounded-[12px] bg-cream-deep px-4 py-3">
              <summary className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-semibold text-ink-900">
                <Eye className="size-4 text-sky-500" aria-hidden /> Xem transcript
              </summary>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{transcript}</p>
            </details>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
