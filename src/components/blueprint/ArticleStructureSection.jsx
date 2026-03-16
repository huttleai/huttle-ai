import BlueprintSectionWrapper from './BlueprintSectionWrapper';
import CopyButton from './CopyButton';

export default function ArticleStructureSection({ data, sectionNumber }) {
  if (!data) return null;

  const headline = data.headline || data.title || '';
  const intro = data.intro || data.intro_paragraph || '';
  const bodySections = data.body_sections || data.sections || [];
  const conclusion = data.conclusion_cta || data.conclusion || '';

  return (
    <BlueprintSectionWrapper icon="📄" title="Article Structure" sectionNumber={sectionNumber}>
      <div className="space-y-4">
        {headline && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Suggested Headline</p>
            <p className="font-bold text-gray-900">{headline}</p>
            <CopyButton text={headline} className="mt-2" />
          </div>
        )}

        {intro && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Intro Framework</p>
            <p className="text-sm text-gray-700 leading-relaxed bg-white/80 p-4 rounded-xl border border-gray-100">{intro}</p>
          </div>
        )}

        {bodySections.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Body Sections</p>
            <div className="space-y-2">
              {bodySections.map((section, i) => {
                const header = typeof section === 'string' ? section : (section.header || section.title || section.heading || '');
                const content = typeof section === 'object' ? (section.content || section.description || '') : '';

                return (
                  <div key={i} className="p-3 bg-white/80 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">H2 —</span>
                      <p className="font-semibold text-gray-900 text-sm">{header}</p>
                    </div>
                    {content && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{content}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {conclusion && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Conclusion + CTA</p>
            <p className="text-sm text-gray-700 leading-relaxed">{conclusion}</p>
          </div>
        )}
      </div>
    </BlueprintSectionWrapper>
  );
}
