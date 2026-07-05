// Markdown renderer for AI chat bubbles: GitHub-flavored markdown (tables,
// strikethrough, task lists) + soft line breaks, styled with the app's theme
// tokens. Wide tables scroll horizontally inside the bubble instead of
// blowing it up. User messages stay plain text — only agent replies use this.
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { SfTokens } from '../../theme/tokens';

interface Props {
  text: string;
  tokens: SfTokens;
}

export function MarkdownText({ text, tokens }: Props) {
  const border = `1px solid ${tokens.cardBorderColor}`;
  return (
    <div className="sf-md break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children }) => <div className="text-[17px] font-extrabold mt-3 mb-1.5 first:mt-0">{children}</div>,
          h2: ({ children }) => <div className="text-[16px] font-extrabold mt-3 mb-1.5 first:mt-0">{children}</div>,
          h3: ({ children }) => <div className="text-[15px] font-extrabold mt-2.5 mb-1 first:mt-0">{children}</div>,
          h4: ({ children }) => <div className="text-[15px] font-bold mt-2 mb-1 first:mt-0">{children}</div>,
          h5: ({ children }) => <div className="text-[14px] font-bold mt-2 mb-1 first:mt-0">{children}</div>,
          h6: ({ children }) => <div className="text-[14px] font-bold mt-2 mb-1 first:mt-0">{children}</div>,
          p: ({ children }) => <p className="my-1 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-1 ps-5 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 ps-5 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          hr: () => <hr className="my-2.5 border-0" style={{ borderTop: border }} />,
          blockquote: ({ children }) => (
            <blockquote className="my-1.5 ps-3" style={{ borderInlineStart: `3px solid ${tokens.accent}` }}>
              {children}
            </blockquote>
          ),
          code: ({ children, className }) =>
            className ? (
              <pre
                className="my-1.5 px-3 py-2 rounded-[10px] text-[13px] overflow-x-auto"
                style={{ background: tokens.surface2, border }}
              >
                <code>{children}</code>
              </pre>
            ) : (
              <code
                className="px-1 py-0.5 rounded text-[13px]"
                style={{ background: tokens.surface2, border }}
              >
                {children}
              </code>
            ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="underline" style={{ color: tokens.accent }}>
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-[10px]" style={{ border }}>
              <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead style={{ background: tokens.surface2 }}>{children}</thead>,
          th: ({ children }) => (
            <th className="px-2.5 py-1.5 font-extrabold whitespace-nowrap text-start" style={{ borderBottom: border }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2.5 py-1.5 align-top" style={{ borderBottom: border }}>
              {children}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
