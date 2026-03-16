import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function ThumbnailConceptSection({ data, sectionNumber }) {
  if (!data) return null;

  const layout = data.layout || data.layout_description || '';
  const textOverlay = data.text_overlay || data.text_suggestions || '';
  const expression = data.expression || data.emotional_expression || '';
  const colorContrast = data.color_contrast || data.colors || '';
  const tip = data.tip || data.clickbait_tip || '';

  return (
    <BlueprintSectionWrapper icon="🖼️" title="Thumbnail Concept" sectionNumber={sectionNumber}>
      <div className="space-y-3">
        {layout && (
          <div className="p-3 bg-red-50/60 rounded-lg border border-red-100/50">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Layout</p>
            <p className="text-sm text-gray-800">{layout}</p>
          </div>
        )}
        {textOverlay && (
          <div className="p-3 bg-white/80 rounded-lg border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Text Overlay</p>
            <p className="text-sm text-gray-700">{typeof textOverlay === 'string' ? textOverlay : (Array.isArray(textOverlay) ? textOverlay.join(', ') : '')}</p>
          </div>
        )}
        {expression && (
          <div className="flex items-center gap-2">
            <span className="text-sm">😀</span>
            <p className="text-sm text-gray-700"><span className="font-semibold">Expression:</span> {expression}</p>
          </div>
        )}
        {colorContrast && (
          <div className="flex items-center gap-2">
            <span className="text-sm">🎨</span>
            <p className="text-sm text-gray-700"><span className="font-semibold">Color Contrast:</span> {colorContrast}</p>
          </div>
        )}
        {tip && (
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100/50">
            <p className="text-sm text-amber-800">💡 {tip}</p>
          </div>
        )}
      </div>
    </BlueprintSectionWrapper>
  );
}
