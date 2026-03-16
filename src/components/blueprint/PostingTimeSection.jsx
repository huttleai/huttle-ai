import BlueprintSectionWrapper from './BlueprintSectionWrapper';

export default function PostingTimeSection({ data, sectionNumber }) {
  if (!data) return null;

  const windows = data.windows || data.recommended_times || data.time_windows || [];
  const dayRec = data.day_recommendation || data.best_day || '';
  const timezoneNote = data.timezone_note || data.timezone || '';
  const frequency = data.frequency || data.frequency_recommendation || '';

  return (
    <BlueprintSectionWrapper icon="⏰" title="Best Posting Time" sectionNumber={sectionNumber}>
      <div className="space-y-4">
        {windows.length > 0 && (
          <div className="space-y-2">
            {windows.map((w, i) => {
              const time = typeof w === 'string' ? w : (w.time || w.window || w.range || '');
              const reason = typeof w === 'object' ? (w.reason || w.description || '') : '';
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';

              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/80 rounded-xl border border-gray-100">
                  <span className="text-lg flex-shrink-0">{medal}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{time}</p>
                    {reason && <p className="text-xs text-gray-500 mt-0.5">{reason}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {dayRec && (
          <div className="flex items-start gap-2 p-3 bg-blue-50/60 rounded-lg border border-blue-100/50">
            <span className="text-sm">📅</span>
            <p className="text-sm text-gray-700">{dayRec}</p>
          </div>
        )}

        {timezoneNote && (
          <p className="text-xs text-gray-500">🌍 {timezoneNote}</p>
        )}

        {frequency && (
          <div className="flex items-start gap-2 p-3 bg-gray-50/80 rounded-lg border border-gray-100">
            <span className="text-sm">🔁</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Posting Frequency</p>
              <p className="text-sm text-gray-700">{frequency}</p>
            </div>
          </div>
        )}
      </div>
    </BlueprintSectionWrapper>
  );
}
