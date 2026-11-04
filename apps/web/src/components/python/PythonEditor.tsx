"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { execPython } from "@/lib/api/practice";
import { ApiError, friendlyApiMessage } from "@/lib/api/client";
import type { PythonExecResult } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Editor Python tối giản (P3, contract mục 4) — task TASK-004-FR mục 3.
 * - textarea mono + số dòng nhẹ (KHÔNG CodeMirror — theo đúng task, không tự thêm lib).
 * - "Chạy ▶" gọi POST /python/exec; hiển thị stdout/stderr/exitCode/timeMs.
 * - Piston phía public đang lỗi (401) → lỗi bên ngoài phải hiện câu thân thiện
 *   "Máy chấm bài đang bận, thử lại sau nhé".
 */

export interface PythonEditorProps {
  setId: string | null;
  isDemo: boolean;
  /** Starter code từ payload của practice set CODING. */
  starterCode: string;
}

export function PythonEditor({ setId, isDemo, starterCode }: PythonEditorProps) {
  const [code, setCode] = useState(starterCode);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PythonExecResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const lineCount = useMemo(() => Math.max(code.split("\n").length, 1), [code]);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      if (isDemo || !setId) {
        // Demo trung thực: không gọi P3 khi chưa đăng nhập/bài demo — không bịa kết quả.
        setError("Chế độ demo — chạy code thật cần backend kết nối máy chấm (Piston). Đăng nhập rồi quay lại nha!");
        return;
      }
      setResult(await execPython({ code }));
    } catch (err) {
      if (err instanceof ApiError && (err.code === "INTERNAL" || err.status >= 500)) {
        // Piston public đang 401/lỗi bên ngoài → câu thân thiện theo task.
        setError("Máy chấm bài đang bận, thử lại sau nhé");
      } else {
        setError(friendlyApiMessage(err));
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span aria-hidden>🐍</span> Chạy thử code Python
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Editor: gutter số dòng + textarea mono, đồng bộ scroll */}
        <div className="flex overflow-hidden rounded-[10px] border border-ink-300/40 bg-[#FFF9F2] focus-within:outline focus-within:outline-2 focus-within:outline-teal-fresh-400">
          <div
            ref={gutterRef}
            aria-hidden
            className="select-none overflow-hidden bg-cream-deep px-2 py-2 text-right font-mono text-sm leading-6 text-ink-500"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={() => {
              if (gutterRef.current && textareaRef.current) {
                gutterRef.current.scrollTop = textareaRef.current.scrollTop;
              }
            }}
            spellCheck={false}
            aria-label="Code Python"
            rows={10}
            className="w-full resize-y bg-transparent px-3 py-2 font-mono text-sm leading-6 text-ink-900 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={running || !code.trim()}>
            {running ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
            Chạy ▶
          </Button>
          <span className="text-sm text-ink-500">{code.length}/10.000 ký tự</span>
        </div>

        {error ? (
          <p role="alert" className="rounded-[12px] bg-coral-50 px-4 py-3 text-sm text-coral-600">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-2 rounded-[12px] bg-cream-deep px-4 py-3 font-mono text-sm">
            <div>
              <span className="font-sans font-semibold text-ink-900">stdout:</span>
              <pre className={cn("mt-1 whitespace-pre-wrap leading-6", result.stdout ? "text-ink-900" : "text-ink-500")}>
                {result.stdout || "(trống)"}
              </pre>
            </div>
            {result.stderr ? (
              <div>
                <span className="font-sans font-semibold text-coral-600">stderr:</span>
                <pre className="mt-1 whitespace-pre-wrap leading-6 text-coral-600">{result.stderr}</pre>
              </div>
            ) : null}
            <p className="font-sans text-ink-700">
              exitCode: {result.exitCode} · {result.timeMs}ms
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
