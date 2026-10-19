"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface MathTextProps {
  text: string;
  className?: string;
}

type Token =
  | { type: "math"; content: string; key: number }
  | { type: "code"; content: string; key: number }
  | { type: "text"; content: string; key: number };

/**
 * MathText renders text with embedded LaTeX math between $...$ symbols,
 * backticked code snippets between `...` symbols,
 * and ensures responsive, non-overflowing text wrapping.
 */
export function MathText({ text, className = "" }: MathTextProps) {
  const parts = useMemo(() => {
    if (!text) return [];

    // Parse both $...$ math and `...` code tokens
    const regex = /(\$[^$]+\$|`[^`]+`)/g;
    const elements: Token[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCount = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
          key: keyCount++,
        });
      }

      const raw = match[1];
      if (raw.startsWith("$") && raw.endsWith("$")) {
        elements.push({
          type: "math",
          content: raw.slice(1, -1),
          key: keyCount++,
        });
      } else if (raw.startsWith("`") && raw.endsWith("`")) {
        elements.push({
          type: "code",
          content: raw.slice(1, -1),
          key: keyCount++,
        });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push({
        type: "text",
        content: text.substring(lastIndex),
        key: keyCount++,
      });
    }

    return elements;
  }, [text]);

  return (
    <span
      className={`math-text-wrapper ${className}`}
      style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        maxWidth: "100%",
        display: "inline",
      }}
    >
      {parts.map((p) => {
        if (p.type === "math") {
          try {
            const html = katex.renderToString(p.content, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={p.key}
                className="inline-math"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <code key={p.key} className="math-fallback">
                ${p.content}$
              </code>
            );
          }
        }
        if (p.type === "code") {
          return (
            <code key={p.key} className="inline-code">
              {p.content}
            </code>
          );
        }
        return <span key={p.key}>{p.content}</span>;
      })}
    </span>
  );
}

export default MathText;
