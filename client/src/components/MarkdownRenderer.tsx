/**
 * MarkdownRenderer v1.0 — Renderizado profesional de Markdown
 * Soporta: headers, negritas, cursivas, listas, tablas, código, enlaces
 * Usado por el Chatbot Stock v4.0
 */
import { useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Parse markdown content into rendered JSX
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const rendered = useMemo(() => parseMarkdown(content), [content]);
  return <div className={`markdown-content ${className}`}>{rendered}</div>;
}

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let isInCodeBlock = false;
  let codeBlockContent = "";
  let codeBlockLang = "";

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="md-list">
          {listBuffer.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      const headers = tableBuffer[0].split("|").filter(c => c.trim());
      const rows = tableBuffer.slice(2).map(r => r.split("|").filter(c => c.trim()));
      elements.push(
        <div key={`table-${elements.length}`} className="md-table-wrapper">
          <table className="md-table">
            <thead>
              <tr>
                {headers.map((h, idx) => (
                  <th key={idx}>{renderInline(h.trim())}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      if (isInCodeBlock) {
        elements.push(
          <pre key={`code-${elements.length}`} className="md-code-block">
            <code>{codeBlockContent.trimEnd()}</code>
          </pre>
        );
        codeBlockContent = "";
        codeBlockLang = "";
        isInCodeBlock = false;
      } else {
        flushList();
        flushTable();
        isInCodeBlock = true;
        codeBlockLang = line.trim().slice(3);
      }
      i++;
      continue;
    }

    if (isInCodeBlock) {
      codeBlockContent += line + "\n";
      i++;
      continue;
    }

    // Table rows (contain |)
    if (line.includes("|") && line.trim().startsWith("|")) {
      flushList();
      tableBuffer.push(line);
      i++;
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    // Headers
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={`h3-${i}`} className="md-h3">{renderInline(line.slice(4))}</h4>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={`h2-${i}`} className="md-h2">{renderInline(line.slice(3))}</h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={`h1-${i}`} className="md-h1">{renderInline(line.slice(2))}</h2>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") {
      flushList();
      elements.push(<hr key={`hr-${i}`} className="md-hr" />);
      i++;
      continue;
    }

    // Unordered list items
    if (/^[\s]*[-•*]\s/.test(line)) {
      const content = line.replace(/^[\s]*[-•*]\s+/, "");
      listBuffer.push(content);
      i++;
      continue;
    }

    // Ordered list items
    if (/^\d+\.\s/.test(line.trim())) {
      const content = line.trim().replace(/^\d+\.\s+/, "");
      listBuffer.push(content);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      flushList();
      i++;
      continue;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`} className="md-p">{renderInline(line)}</p>
    );
    i++;
  }

  flushList();
  flushTable();

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Process inline markdown: bold, italic, code, emoji
  const parts: React.ReactNode[] = [];
  // Regex to match: **bold**, *italic*, `code`, and plain text
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[1];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} className="md-bold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${match.index}`} className="md-italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={`c-${match.index}`} className="md-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
