import BlueprintSectionWrapper from './BlueprintSectionWrapper';
import PremiumScriptRenderer from '../PremiumScriptRenderer';

export default function ScriptSection({ data, sectionNumber }) {
  if (!data) return null;

  const fullScript = typeof data === 'string' ? data : (data.full_script || data.script || data.content || '');
  const wordCount = data.word_count || fullScript.split(/\s+/).filter(Boolean).length;
  const readTime = data.estimated_read_time || `~${Math.ceil(wordCount / 150)} min`;
  const timestamps = data.timestamps || [];

  if (!fullScript) return null;

  return (
    <BlueprintSectionWrapper
      icon="📜"
      title="Script"
      badge={`${wordCount} words · ${readTime}`}
      sectionNumber={sectionNumber}
    >
      {timestamps.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Timestamps</p>
          <div className="flex flex-wrap gap-2">
            {timestamps.map((ts, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-mono font-medium border border-indigo-100">
                {typeof ts === 'string' ? ts : `${ts.time || ts.timestamp} — ${ts.label || ts.description || ''}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <PremiumScriptRenderer
        content={fullScript}
        onCopy={() => navigator.clipboard.writeText(fullScript)}
      />
    </BlueprintSectionWrapper>
  );
}
