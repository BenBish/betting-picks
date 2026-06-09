'use client';

import { useState } from 'react';
import { settlePickAction } from '@/lib/server-actions';
import { calculateProfitLoss } from '@/lib/calculations';
import { PickWithClv } from '@/lib/picks-service';

interface SettleDialogProps {
  pick: PickWithClv;
  onClose: () => void;
}

const RESULTS = ['won', 'lost', 'push', 'void'] as const;

export function SettleDialog({ pick, onClose }: SettleDialogProps) {
  const [selectedResult, setSelectedResult] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const previewPl = selectedResult
    ? calculateProfitLoss(selectedResult, pick.stake, pick.recommended_odds)
    : null;

  const handleSettle = async () => {
    if (!selectedResult) return;
    setSubmitting(true);
    setError('');

    const result = await settlePickAction(pick.id, selectedResult);
    if (result.success) {
      onClose();
    } else {
      setError(result.errors?.[0] || 'Failed to settle');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Settle Pick</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
            type="button"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          <span className="font-medium">{pick.home_team}</span> vs{' '}
          <span className="font-medium">{pick.away_team}</span>
          <br />
          {pick.market}: {pick.selection} @ {pick.recommended_odds}
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-4 gap-2">
          {RESULTS.map((r) => (
            <button
              key={r}
              onClick={() => setSelectedResult(r)}
              className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${
                selectedResult === r
                  ? r === 'won'
                    ? 'bg-green-100 text-green-700 ring-1 ring-green-500'
                    : r === 'lost'
                      ? 'bg-red-100 text-red-700 ring-1 ring-red-500'
                      : 'bg-slate-100 text-slate-700 ring-1 ring-slate-400'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {previewPl !== null && (
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">Stake: {pick.stake} unit{pick.stake !== 1 ? 's' : ''}</p>
            <p className={`text-lg font-semibold ${previewPl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {previewPl >= 0 ? '+' : ''}{previewPl.toFixed(2)} units
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSettle}
            disabled={!selectedResult || submitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Settle'}
          </button>
        </div>
      </div>
    </div>
  );
}
