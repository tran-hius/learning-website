import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Render Markdown + KaTeX cho nội dung bài học (guide mục 3: công thức
 * nền #FFF4E6, cỡ 1.05em). Dùng được trong Server Component.
 */

/** Text thuần từ node hast (để sinh id mục lục). */
function hastText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; value?: string; children?: unknown[] };
  if (n.type === "text") return n.value ?? "";
  return (n.children ?? []).map(hastText).join("");
}

/** Slug id cho heading mục lục — bỏ dấu tiếng Việt, non-alnum → "-". */
export function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Lấy danh sách heading ## / ### từ markdown nguồn (cho sidebar mục lục). */
export function extractHeadings(
  markdown: string,
): Array<{ level: 2 | 3; text: string; id: string }> {
  const out: Array<{ level: 2 | 3; text: string; id: string }> = [];
  for (const line of markdown.split("\n")) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, "").trim();
    out.push({ level: m[1].length as 2 | 3, text, id: slugifyHeading(text) });
  }
  return out;
}

export function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div className="lesson-prose flex flex-col gap-4 text-[16px] leading-[1.65] text-ink-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h2: ({ node, ...props }) => {
            const id = slugifyHeading(hastText(node));
            return (
              <h2
                id={id}
                className="scroll-mt-24 pt-4 text-xl font-bold text-ink-900"
                {...props}
              />
            );
          },
          h3: ({ node, ...props }) => {
            const id = slugifyHeading(hastText(node));
            return (
              <h3
                id={id}
                className="scroll-mt-24 pt-2 text-lg font-semibold text-ink-900"
                {...props}
              />
            );
          },
          p: (props) => <p className="text-ink-700" {...props} />,
          ul: (props) => <ul className="flex list-disc flex-col gap-1.5 pl-5" {...props} />,
          ol: (props) => <ol className="flex list-decimal flex-col gap-1.5 pl-5" {...props} />,
          li: (props) => <li className="pl-1" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="rounded-[12px] bg-cream-deep px-4 py-3 text-[15px] text-ink-700"
              {...props}
            />
          ),
          code: (props) => (
            <code
              className="rounded-[6px] bg-cream-deep px-1.5 py-0.5 font-mono text-sm text-ink-900"
              {...props}
            />
          ),
          table: (props) => (
            <div className="overflow-x-auto rounded-[12px] border border-ink-300/40">
              <table className="w-full text-left text-sm" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border-b border-ink-300/40 bg-cream-deep px-3 py-2 font-semibold text-ink-900" {...props} />
          ),
          td: (props) => <td className="border-b border-ink-300/20 px-3 py-2" {...props} />,
          a: (props) => <a className="text-teal-fresh-600 underline-offset-4 hover:underline" {...props} />,
          img: (props) => (
            // eslint-disable-next-line @next/next/no-img-element -- markdown content ảnh từ admin (Cloudinary URL ngoài), next/image cần config domain
            <img
              alt=""
              className="rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
              loading="lazy"
              {...props}
            />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
