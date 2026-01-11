import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * MarkdownRenderer - A beautifully styled markdown renderer component
 * 
 * Renders markdown content with professional Tailwind CSS styling.
 * Supports GitHub Flavored Markdown (tables, strikethrough, autolinks, task lists).
 * 
 * @param {Object} props
 * @param {string} props.content - The markdown content to render
 * @param {string} props.className - Additional CSS classes for the container
 * @param {boolean} props.compact - Use compact spacing (default: false)
 */
export default function MarkdownRenderer({ content, className = '', compact = false }) {
  if (!content) return null;

  const baseSpacing = compact ? 'space-y-2' : 'space-y-4';

  return (
    <div className={`markdown-content ${baseSpacing} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with distinct hierarchy
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b border-gray-200 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-gray-900 mt-5 mb-3 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-gray-800 mt-3 mb-2 first:mt-0">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-gray-800 mt-3 mb-1 first:mt-0">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-medium text-gray-700 mt-2 mb-1 first:mt-0">
              {children}
            </h6>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-gray-700 leading-relaxed">
              {children}
            </p>
          ),

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">
              {children}
            </strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-gray-700">
              {children}
            </em>
          ),

          // Links - Huttle brand blue with hover effect
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-huttle-primary hover:text-huttle-primary-dark underline decoration-huttle-primary/30 hover:decoration-huttle-primary transition-colors"
            >
              {children}
            </a>
          ),

          // Unordered lists with proper indentation
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-1.5 text-gray-700 marker:text-huttle-primary">
              {children}
            </ul>
          ),

          // Ordered lists with proper indentation
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-1.5 text-gray-700 marker:text-gray-500 marker:font-medium">
              {children}
            </ol>
          ),

          // List items
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">
              {children}
            </li>
          ),

          // Blockquotes with left accent border
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-huttle-primary/40 bg-huttle-50/50 pl-4 py-3 pr-4 rounded-r-lg italic text-gray-700">
              {children}
            </blockquote>
          ),

          // Inline code
          code: ({ inline, children, className }) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            // Code blocks
            return (
              <code className={`block ${className || ''}`}>
                {children}
              </code>
            );
          },

          // Code blocks (pre wrapper)
          pre: ({ children }) => (
            <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm font-mono leading-relaxed shadow-inner">
              {children}
            </pre>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="border-t border-gray-200 my-6" />
          ),

          // Tables (via remark-gfm)
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border border-gray-200 my-4">
              <table className="min-w-full divide-y divide-gray-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white divide-y divide-gray-200">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-700">
              {children}
            </td>
          ),

          // Task lists (via remark-gfm)
          input: ({ checked, disabled, ...props }) => (
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              className="mr-2 rounded border-gray-300 text-huttle-primary focus:ring-huttle-primary/20"
              {...props}
            />
          ),

          // Strikethrough (via remark-gfm)
          del: ({ children }) => (
            <del className="text-gray-400 line-through">
              {children}
            </del>
          ),

          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="rounded-lg max-w-full h-auto shadow-sm border border-gray-200"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * MarkdownCard - Markdown content wrapped in a styled card container
 * 
 * @param {Object} props
 * @param {string} props.content - The markdown content to render
 * @param {string} props.title - Optional card title
 * @param {React.ReactNode} props.icon - Optional icon component
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.headerClassName - Additional CSS classes for the header
 */
export function MarkdownCard({ 
  content, 
  title, 
  icon: Icon, 
  className = '',
  headerClassName = 'bg-gradient-to-r from-huttle-primary/5 to-purple-50'
}) {
  if (!content) return null;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className={`px-5 py-4 border-b border-gray-100 ${headerClassName}`}>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-huttle-primary" />}
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
      )}
      <div className="p-5">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}



