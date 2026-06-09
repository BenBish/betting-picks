'use client';

import { useState, FormEvent } from 'react';
import { addPickAction } from '@/lib/server-actions';

interface PickFormProps {
  onClose: () => void;
}

export function PickForm({ onClose }: PickFormProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await addPickAction(null, formData);

    if (result.success) {
      onClose();
    } else {
      setErrors(result.errors || ['Failed to create pick']);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Add New Pick</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
            type="button"
          >
            ✕
          </button>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Home Team *
              </label>
              <input
                name="home_team"
                required
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Liverpool"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Away Team *
              </label>
              <input
                name="away_team"
                required
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Tottenham"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Match Date *
            </label>
            <input
              name="match_date"
              required
              type="datetime-local"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Competition
              </label>
              <input
                name="competition"
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Premier League"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Source
              </label>
              <input
                name="source"
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Tipster name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Market *
              </label>
              <input
                name="market"
                required
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Match Winner"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Selection *
              </label>
              <input
                name="selection"
                required
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Liverpool"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Recommended Odds *
              </label>
              <input
                name="recommended_odds"
                required
                type="number"
                step="0.01"
                min="1.01"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="1.95"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Stake (units)
              </label>
              <input
                name="stake"
                type="number"
                step="0.1"
                min="0"
                defaultValue="1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Pick'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
