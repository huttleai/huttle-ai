import BlueprintSectionWrapper from './BlueprintSectionWrapper';
import CopyButton from './CopyButton';

export default function CTASection({ data, sectionNumber }) {
  if (!data) return null;

  const variations = data.variations || data.ctas || [];

  if (variations.length === 0 && typeof data === 'string') {
    return (
      <BlueprintSectionWrapper icon="🎯" title="Call to Action" sectionNumber={sectionNumber}>
        <div className="p-4 bg-green-50/60 rounded-xl border border-green-200/50">
          <p className="text-sm text-gray-800 font-medium">{data}</p>
          <CopyButton text={data} className="mt-2" />
        </div>
      </BlueprintSectionWrapper>
    );
  }

  return (
    <BlueprintSectionWrapper icon="🎯" title="Call to Action" badge={`${variations.length} variations`} sectionNumber={sectionNumber}>
      <div className="space-y-3">
        {variations.map((cta, i) => {
          const text = typeof cta === 'string' ? cta : (cta.text || cta.cta || '');
          const placement = typeof cta === 'object' ? (cta.placement || '') : '';

          return (
            <div key={i} className="group p-4 bg-gradient-to-r from-green-50/60 to-emerald-50/40 rounded-xl border border-green-200/50 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm text-gray-800 font-medium leading-relaxed">{text}</p>
                    {placement && <p className="text-xs text-gray-500 mt-1">📍 {placement}</p>}
                  </div>
                </div>
                <CopyButton text={text} className="flex-shrink-0 opacity-0 group-hover:opacity-100" />
              </div>
            </div>
          );
        })}
      </div>
    </BlueprintSectionWrapper>
  );
}
