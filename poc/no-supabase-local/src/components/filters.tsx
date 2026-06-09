'use client';

import { useRouter } from 'next/navigation';

interface FiltersProps {
  sources: string[];
  competitions: string[];
}

export function Filters({ sources, competitions }: FiltersProps) {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();

    const source = formData.get('source') as string;
    const competition = formData.get('competition') as string;
    const result = formData.get('result') as string;
    const team = formData.get('team') as string;
    const date_from = formData.get('date_from') as string;
    const date_to = formData.get('date_to') as string;

    if (source) params.set('source', source);
    if (competition) params.set('competition', competition);
    if (result) params.set('result', result);
    if (team) params.set('team', team);
    if (date_from) params.set('date_from', date_from);
    if (date_to) params.set('date_to', date_to);

    const query = params.toString();
    router.push(query ? `?${query}` : '/');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Source</label>
        <select
          name="source"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Competition</label>
        <select
          name="competition"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All</option>
          {competitions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Result</label>
        <select
          name="result"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="unsettled">Unsettled</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="push">Push</option>
          <option value="void">Void</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Team</label>
        <input
          name="team"
          type="text"
          placeholder="Search team..."
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
        <input
          name="date_from"
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
        <input
          name="date_to"
          type="date"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
      >
        Filter
      </button>
    </form>
  );
}
