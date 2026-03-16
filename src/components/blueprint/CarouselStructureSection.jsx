import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function CarouselStructureSection({ data, sectionNumber }) {
  if (!data) return null;

  const slides = data.slides || data.breakdown || [];
  const totalSlides = data.total_slides || data.recommended_slides || slides.length;
  const saveBait = data.save_bait_explanation || data.save_bait || '';

  if (slides.length === 0) return null;

  return (
    <BlueprintSectionWrapper icon="🎠" title="Carousel Structure" badge={`${totalSlides} slides`} sectionNumber={sectionNumber}>
      <div className="space-y-3">
        {slides.map((slide, i) => {
          const isHook = i === 0;
          const isCTA = i === slides.length - 1 && slides.length > 2;
          const headline = slide.headline || slide.title || slide.text || '';
          const keyPoint = slide.key_point || slide.body || slide.description || '';
          const visual = slide.visual_direction || slide.visual || '';

          let slideType = 'Value';
          let typeBg = 'bg-blue-50 border-blue-200/50';
          let typeText = 'text-blue-600';
          if (isHook) { slideType = 'Hook'; typeBg = 'bg-amber-50 border-amber-200/50'; typeText = 'text-amber-600'; }
          if (isCTA) { slideType = 'CTA'; typeBg = 'bg-green-50 border-green-200/50'; typeText = 'text-green-600'; }

          return (
            <div key={i} className={`p-4 rounded-xl border ${typeBg}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-gray-900 text-white flex items-center justify-center font-bold text-[10px]">
                  {i + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${typeText}`}>{slideType} Slide</span>
              </div>
              {headline && <p className="font-semibold text-gray-900 text-sm">{headline}</p>}
              {keyPoint && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{keyPoint}</p>}
              {visual && (
                <p className="text-xs text-gray-500 mt-2 italic">🎨 {visual}</p>
              )}
            </div>
          );
        })}
      </div>

      {saveBait && (
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/60">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">🔖 Why This Earns Saves</p>
          <p className="text-sm text-amber-800 leading-relaxed">{saveBait}</p>
        </div>
      )}
    </BlueprintSectionWrapper>
  );
}
