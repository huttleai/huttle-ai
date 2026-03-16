import BlueprintSectionWrapper from './BlueprintSectionWrapper';
import CopyButton from './CopyButton';

export default function DuetStitchSection({ data, sectionNumber }) {
  if (!data) return null;

  const duetScore = data.duet_score ?? data.duet_potential ?? null;
  const stitchScore = data.stitch_score ?? data.stitch_potential ?? null;
  const hookPhrase = data.hook_phrase || '';
  const responsePrompt = data.response_prompt || data.suggested_response || '';

  return (
    <BlueprintSectionWrapper icon="🤝" title="Duet/Stitch Potential" sectionNumber={sectionNumber}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {duetScore !== null && (
            <div className="p-4 bg-pink-50/60 rounded-xl border border-pink-200/50 text-center">
              <p className="text-[10px] font-bold text-pink-600 uppercase tracking-widest mb-1">Duet Potential</p>
              <p className="text-2xl font-bold text-gray-900">{duetScore}<span className="text-sm text-gray-400">/10</span></p>
            </div>
          )}
          {stitchScore !== null && (
            <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-200/50 text-center">
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">Stitch Potential</p>
              <p className="text-2xl font-bold text-gray-900">{stitchScore}<span className="text-sm text-gray-400">/10</span></p>
            </div>
          )}
        </div>

        {hookPhrase && (
          <div className="p-4 bg-white/80 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hook Phrase to Invite Responses</p>
            <p className="text-sm text-gray-800 font-medium leading-relaxed">{hookPhrase}</p>
            <CopyButton text={hookPhrase} className="mt-2" />
          </div>
        )}

        {responsePrompt && (
          <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Suggested Response Prompt</p>
            <p className="text-sm text-gray-700 leading-relaxed">{responsePrompt}</p>
          </div>
        )}
      </div>
    </BlueprintSectionWrapper>
  );
}
