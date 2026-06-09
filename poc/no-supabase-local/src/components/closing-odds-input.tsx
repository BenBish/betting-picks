'use client';

import { useState } from 'react';
import { updateClosingOddsAction } from '@/lib/server-actions';

interface ClosingOddsInputProps {
  pickId: string;
  currentOdds: number | null;
}

export function ClosingOddsInput({ pickId, currentOdds }: ClosingOddsInputProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentOdds?.toString() || '');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const odds = parseFloat(value);
    if (isNaN(odds) || odds <= 1) {
      setError('Must be greater than 1');
      return;
    }
    setError('');
    const result = await updateClosingOddsAction(pickId, odds);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.errors?.[0] || 'Failed to update');
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          min="1.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') {
              setValue(currentOdds?.toString() || '');
              setEditing(false);
            }
          }}
          className="w-20 rounded border border-blue-300 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setValue(currentOdds?.toString() || '');
        setEditing(true);
      }}
      className={`rounded px-2 py-1 text-sm font-mono transition-colors hover:bg-slate-100 ${
        currentOdds ? 'text-slate-700' : 'text-amber-500 italic'
      }`}
      title="Click to edit closing odds"
    >
      {currentOdds ? currentOdds.toFixed(2) : '—'}
    </button>
  );
}
