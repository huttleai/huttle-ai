import BlueprintSectionWrapper from './BlueprintSectionWrapper';

const TIP_ICONS = ['🧠', '⚡', '🎯', '💎', '🔥'];

export default function ProTipsSection({ data, sectionNumber }) {
  if (!data) return null;

  const tips = Array.isArray(data) ? data : (data.tips || []);
  if (tips.length === 0) return null;

  return (
    <BlueprintSectionWrapper icon="💡" title="Pro Tips" sectionNumber={sectionNumber}>
      <div className="space-y-3">
        {tips.map((tip, i) => {
          const icon = TIP_ICONS[i % TIP_ICONS.length];
          const headline = typeof tip === 'object' ? (tip.headline || tip.title || '') : '';
          const explanation = typeof tip === 'object' ? (tip.explanation || tip.description || tip.text || '') : tip;

          return (
            <div key={i} className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-sm">{icon}</span>
              </div>
              <div className="flex-1">
                {headline && <p className="font-bold text-gray-900 text-sm mb-0.5">{headline}</p>}
                <p className="text-sm text-gray-600 leading-relaxed">{explanation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </BlueprintSectionWrapper>
  );
}
