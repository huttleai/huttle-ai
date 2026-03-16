import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function StoryArcSection({ data, sectionNumber }) {
  if (!data) return null;

  const frames = data.frames || data.breakdown || [];
  const interactiveSuggestions = data.interactive_suggestions || data.interactive_elements || [];
  const linkPlacement = data.link_cta_placement || data.cta_placement || '';

  if (frames.length === 0 && typeof data === 'string') {
    return (
      <BlueprintSectionWrapper icon="📖" title="Story Arc" sectionNumber={sectionNumber}>
        <p className="text-sm text-gray-800 leading-relaxed">{data}</p>
      </BlueprintSectionWrapper>
    );
  }

  return (
    <BlueprintSectionWrapper icon="📖" title="Story Arc" badge={`${frames.length} frames`} sectionNumber={sectionNumber}>
      <div className="space-y-3">
        {frames.map((frame, i) => {
          const visual = frame.visual_description || frame.visual || '';
          const textOverlay = frame.text_overlay || frame.text || '';
          const interactive = frame.interactive_element || frame.interaction || '';

          return (
            <div key={i} className="p-4 bg-white/80 rounded-xl border border-purple-100/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center font-bold text-[10px]">
                  {i + 1}
                </div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Frame {i + 1}</span>
              </div>
              {visual && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Visual</p>
                  <p className="text-sm text-gray-700">{visual}</p>
                </div>
              )}
              {textOverlay && (
                <div className="mb-2 p-2 bg-amber-50/60 rounded-lg border border-amber-100/50">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Text Overlay</p>
                  <p className="text-sm text-gray-800 font-medium">{textOverlay}</p>
                </div>
              )}
              {interactive && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-xs">🎯</span>
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-semibold">{interactive}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {interactiveSuggestions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Interactive Element Ideas</p>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(interactiveSuggestions) ? interactiveSuggestions : [interactiveSuggestions]).map((el, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-semibold border border-pink-200/60">
                {typeof el === 'string' ? el : el.type || el.name || ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {linkPlacement && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-600">🔗 <span className="font-semibold">Link/CTA Sticker:</span> {linkPlacement}</p>
        </div>
      )}
    </BlueprintSectionWrapper>
  );
}
