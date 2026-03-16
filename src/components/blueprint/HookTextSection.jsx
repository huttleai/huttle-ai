import BlueprintSectionWrapper from './BlueprintSectionWrapper';
import CopyButton from './CopyButton';

export default function HookTextSection({ data, sectionNumber }) {
  if (!data) return null;

  const variations = data.variations || data.hooks || [];
  const powerWords = data.power_words || [];

  if (variations.length === 0 && typeof data === 'string') {
    return (
      <BlueprintSectionWrapper icon="✍️" title="Hook Text" sectionNumber={sectionNumber}>
        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/50">
          <p className="text-gray-800 leading-relaxed font-medium">{data}</p>
          <CopyButton text={data} className="mt-3" />
        </div>
      </BlueprintSectionWrapper>
    );
  }

  return (
    <BlueprintSectionWrapper icon="✍️" title="Hook Text" badge={`${variations.length} variations`} sectionNumber={sectionNumber}>
      <div className="space-y-3">
        {variations.map((hook, i) => {
          const text = typeof hook === 'string' ? hook : (hook.text || hook.hook || '');
          const charCount = typeof hook === 'object' ? hook.character_count : text.length;

          return (
            <div key={i} className="group flex items-start gap-3 p-4 bg-white/80 rounded-xl border border-amber-100/60 hover:border-amber-200 hover:shadow-md transition-all">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 leading-relaxed font-medium">{text}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold">
                  {charCount} chars
                </span>
              </div>
              <CopyButton text={text} label="Copy" className="flex-shrink-0 opacity-0 group-hover:opacity-100" />
            </div>
          );
        })}
      </div>

      {powerWords.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Power Words</p>
          <div className="flex flex-wrap gap-1.5">
            {powerWords.map((word, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{word}</span>
            ))}
          </div>
        </div>
      )}
    </BlueprintSectionWrapper>
  );
}
