import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function BoostReadinessSection({ data, sectionNumber }) {
  if (!data) return null;

  const score = data.score ?? data.boost_readiness ?? null;
  const reasons = data.reasons || data.what_makes_boost_ready || [];
  const audienceTargeting = data.audience_targeting || data.targeting || '';
  const budgetRec = data.budget_recommendation || data.budget || '';

  const scoreColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = score >= 80 ? 'from-green-50 to-emerald-50 border-green-200' : score >= 50 ? 'from-amber-50 to-yellow-50 border-amber-200' : 'from-red-50 to-rose-50 border-red-200';

  return (
    <BlueprintSectionWrapper icon="🚀" title="Boost Readiness" sectionNumber={sectionNumber}>
      <div className="space-y-4">
        {score !== null && (
          <div className={`p-5 bg-gradient-to-r ${scoreBg} rounded-xl border text-center`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Boost Readiness Score</p>
            <p className={`text-4xl font-bold ${scoreColor}`}>{score}<span className="text-sm text-gray-400">/100</span></p>
          </div>
        )}

        {reasons.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">What Makes It Boost-Ready</p>
            <ul className="space-y-1.5">
              {(Array.isArray(reasons) ? reasons : [reasons]).map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {typeof reason === 'string' ? reason : reason.text || ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {audienceTargeting && (
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100/50">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Audience Targeting</p>
            <p className="text-sm text-gray-700">{audienceTargeting}</p>
          </div>
        )}

        {budgetRec && (
          <div className="p-3 bg-green-50/60 rounded-lg border border-green-100/50">
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">💰 Budget Recommendation</p>
            <p className="text-sm text-gray-700">{budgetRec}</p>
          </div>
        )}
      </div>
    </BlueprintSectionWrapper>
  );
}
