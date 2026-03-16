import BlueprintSectionWrapper from './BlueprintSectionWrapper';
import CopyButton from './CopyButton';

export default function ThreadStructureSection({ data, sectionNumber }) {
  if (!data) return null;

  const tweets = data.tweets || data.breakdown || [];

  if (tweets.length === 0) return null;

  return (
    <BlueprintSectionWrapper icon="🧵" title="Thread Structure" badge={`${tweets.length} tweets`} sectionNumber={sectionNumber}>
      <div className="space-y-3">
        {tweets.map((tweet, i) => {
          const isHook = i === 0;
          const isCTA = i === tweets.length - 1 && tweets.length > 2;
          const text = typeof tweet === 'string' ? tweet : (tweet.text || tweet.content || '');
          const charCount = typeof tweet === 'object' ? (tweet.character_count || text.length) : text.length;

          let typeLabel = '';
          let borderColor = 'border-gray-100';
          if (isHook) { typeLabel = 'Hook Tweet'; borderColor = 'border-amber-200/60'; }
          if (isCTA) { typeLabel = 'CTA Tweet'; borderColor = 'border-green-200/60'; }

          return (
            <div key={i} className={`group p-4 bg-white/80 rounded-xl border ${borderColor} hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-gray-900 text-white flex items-center justify-center font-bold text-[10px]">
                    {i + 1}
                  </div>
                  {typeLabel && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isHook ? 'text-amber-600' : 'text-green-600'}`}>
                      {typeLabel}
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold">{charCount} chars</span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
              <CopyButton text={text} className="mt-2 opacity-0 group-hover:opacity-100" />
            </div>
          );
        })}
      </div>
    </BlueprintSectionWrapper>
  );
}
