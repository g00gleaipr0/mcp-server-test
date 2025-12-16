'use client';

import React, { memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock = ({
  language,
  value,
}: {
  language: string;
  value: string;
}) => {
  const [isCopied, setIsCopied] = React.useState(false);

  const copyToClipboard = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-md overflow-hidden my-4 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
          {language}
        </span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          borderRadius: 0,
        }}
        showLineNumbers={true}
        wrapLines={true}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export const MarkdownRenderer = memo(({ content }: MarkdownRendererProps) => {
  const components: Components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const value = String(children).replace(/\n$/, '');

      if (!inline && match) {
        return <CodeBlock language={language} value={value} />;
      }

      return (
        <code
          className="bg-zinc-100 dark:bg-zinc-800 text-pink-500 dark:text-pink-400 rounded px-1.5 py-0.5 text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
    // Customize other elements
    p: ({ children }) => (
      <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-6 mb-4 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-6 mb-4 last:mb-0">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 py-1 mb-4 italic text-zinc-600 dark:text-zinc-400">
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline break-all"
      >
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
        <table className="w-full text-left text-sm border-collapse">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 last:border-0">
        {children}
      </td>
    ),
  };

  return (
    <div className="prose dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

