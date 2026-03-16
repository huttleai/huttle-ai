import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function AudioVibeSection({ data, sectionNumber }) {
  if (!data) return null;

  const options = data.options || [];
  const trendingTip = data.trending_sound_tip || data.trending_tip || '';

  const singleMood = data.mood || data.music_style || '';
  const singleBpm = data.bpm || '';
  const singleSuggestion = data.suggestion || '';

  if (options.length === 0 && singleMood) {
    return (
      <BlueprintSectionWrapper icon="🎵" title="Audio Vibe" sectionNumber={sectionNumber}>
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50/60 to-violet-50/40 rounded-xl border border-pink-100/50">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-xl">🎶</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{singleMood}</p>
            {singleBpm && <p className="text-xs text-gray-500 mt-0.5">BPM: {singleBpm}</p>}
          </div>
        </div>
        {singleSuggestion && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
            💡 {singleSuggestion}
          </p>
        )}
      </BlueprintSectionWrapper>
    );
  }

  return (
    <BlueprintSectionWrapper icon="🎵" title="Audio Vibe" badge={`${options.length} options`} sectionNumber={sectionNumber}>
      <div className="space-y-3">
        {options.map((opt, i) => {
          const mood = opt.mood || opt.label || opt.name || '';
          const genre = opt.genre_style || opt.genre || '';
          const bpmLabel = opt.bpm_label || opt.bpm || opt.energy || '';

          return (
            <div key={i} className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50/60 to-violet-50/40 rounded-xl border border-pink-100/50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{mood}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {genre && <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-semibold">{genre}</span>}
                  {bpmLabel && <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-semibold">{bpmLabel}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {trendingTip && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-sm text-gray-600">🔥 <span className="font-semibold">Trending Sounds:</span> {trendingTip}</p>
        </div>
      )}
    </BlueprintSectionWrapper>
  );
}
