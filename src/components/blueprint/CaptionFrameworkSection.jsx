import BlueprintSectionWrapper from './BlueprintSectionWrapper';
import CopyButton from './CopyButton';

export default function CaptionFrameworkSection({ data, sectionNumber }) {
  if (!data) return null;

  const variations = data.variations || [];
  const emojiPlacement = data.emoji_placement || '';
  const lineBreakGuide = data.line_break_guide || data.line_break_structure || '';

  if (variations.length === 0 && typeof data === 'string') {
    return (
      <BlueprintSectionWrapper icon="📝" title="Caption Framework" sectionNumber={sectionNumber}>
        <div className="p-4 bg-white/80 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{data}</p>
          <CopyButton text={data} className="mt-3" />
        </div>
      </BlueprintSectionWrapper>
    );
  }

  const styleIcons = { 'Short/Punchy': '⚡', 'Storytelling': '📖', 'Question-Based': '❓', short: '⚡', storytelling: '📖', question: '❓' };

  return (
    <BlueprintSectionWrapper icon="📝" title="Caption Framework" badge={`${variations.length} variations`} sectionNumber={sectionNumber}>
      <div className="space-y-4">
        {variations.map((v, i) => {
          const style = typeof v === 'string' ? '' : (v.style || v.type || '');
          const text = typeof v === 'string' ? v : (v.text || v.caption || '');
          const charCount = typeof v === 'object' ? (v.character_count || text.length) : text.length;
          const emoji = typeof v === 'object' ? (v.emoji_placement || '') : '';
          const icon = styleIcons[style] || styleIcons[style?.toLowerCase()] || '📝';

          return (
            <div key={i} className="group p-4 bg-white/80 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{style || `Variation ${i + 1}`}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold">{charCount} chars</span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
              {emoji && <p className="mt-2 text-xs text-gray-500">Emoji: {emoji}</p>}
              <CopyButton text={text} className="mt-3 opacity-0 group-hover:opacity-100" />
            </div>
          );
        })}
      </div>

      {(emojiPlacement || lineBreakGuide) && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {emojiPlacement && <p className="text-xs text-gray-500">😀 <span className="font-semibold">Emoji tip:</span> {emojiPlacement}</p>}
          {lineBreakGuide && <p className="text-xs text-gray-500">↩️ <span className="font-semibold">Line breaks:</span> {lineBreakGuide}</p>}
        </div>
      )}
    </BlueprintSectionWrapper>
  );
}
