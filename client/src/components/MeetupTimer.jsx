import { useState, useEffect } from 'react';

const MeetupTimer = ({ startTime, durationMinutes = 15, onExpire }) => {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const calc = () => {
      const start = new Date(startTime).getTime();
      const end = start + durationMinutes * 60 * 1000;
      const left = Math.max(0, end - Date.now());
      setRemaining(left);
      if (left === 0 && onExpire) onExpire();
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [startTime, durationMinutes, onExpire]);

  if (remaining === null) return null;

  const expired = remaining === 0;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const pct = ((durationMinutes * 60 * 1000 - remaining) / (durationMinutes * 60 * 1000)) * 100;
  const danger = remaining < 5 * 60 * 1000;

  return (
    <div className={`mt-4 rounded-xl p-4 ${expired ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`font-semibold text-sm ${expired ? 'text-red-700' : 'text-orange-700'}`}>
          {expired ? '⚠️ Grace Period Expired' : '⏱ Grace Period'}
        </p>
        {!expired && (
          <p className={`text-xl font-mono font-bold ${danger ? 'text-red-600' : 'text-orange-700'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </p>
        )}
      </div>
      {!expired && (
        <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${danger ? 'bg-red-500' : 'bg-orange-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className={`text-xs mt-2 ${expired ? 'text-red-600' : 'text-orange-600'}`}>
        {expired ? 'File a no-show if the other party did not arrive.' : 'Scan the QR code before the timer runs out.'}
      </p>
    </div>
  );
};

export default MeetupTimer;
