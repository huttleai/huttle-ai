import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

/**
 * Premium Script Renderer with Markdown support
 * Styles headers, bold text, and provides copy functionality
 */
export default function PremiumScriptRenderer({ content, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(content);
    } else {
      navigator.clipboard.writeText(content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {/* Copy Button - Floating top right */}
      <button
        onClick={handleCopy}
        className="absolute top-4 right-4 z-10 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-xs font-medium text-gray-700 hover:text-gray-900 opacity-0 group-hover:opacity-100"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-600" />
            <span className="text-green-600">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Script</span>
          </>
        )}
      </button>

      {/* Markdown Content */}
      <div className="prose prose-sm max-w-none premium-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Style H3 headers as section titles with subtle background
            h3: ({ node, ...props }) => (
              <h3 
                className="text-xs font-bold uppercase tracking-widest text-gray-700 mt-6 mb-3 first:mt-0 bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-400 px-4 py-3 rounded-r-lg shadow-sm"
                {...props}
              />
            ),
            h2: ({ node, ...props }) => (
              <h2 
                className="text-sm font-bold uppercase tracking-wide text-gray-600 mt-5 mb-3 first:mt-0"
                {...props}
              />
            ),
            // Style bold text with accent color
            strong: ({ node, ...props }) => (
              <strong 
                className="font-semibold text-indigo-600"
                {...props}
              />
            ),
            // Style paragraphs
            p: ({ node, ...props }) => (
              <p 
                className="text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap"
                {...props}
              />
            ),
            // Style lists with better spacing for readability
            ul: ({ node, ...props }) => (
              <ul 
                className="space-y-3 my-4 list-disc list-inside"
                {...props}
              />
            ),
            ol: ({ node, ...props }) => (
              <ol 
                className="space-y-3 my-4 list-decimal list-inside"
                {...props}
              />
            ),
            li: ({ node, ...props }) => (
              <li 
                className="text-gray-700 leading-relaxed ml-4 pl-2"
                {...props}
              />
            ),
            // Style code blocks
            code: ({ node, inline, ...props }) => 
              inline ? (
                <code 
                  className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-mono"
                  {...props}
                />
              ) : (
                <code 
                  className="block px-4 py-3 bg-gray-50 text-gray-800 rounded-lg text-sm font-mono my-3 whitespace-pre-wrap"
                  {...props}
                />
              )
          }}
        >
          {content || 'No content available'}
        </ReactMarkdown>
      </div>
    </div>
  );
}

