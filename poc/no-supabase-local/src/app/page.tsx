import { fetchPicks } from '@/lib/server-actions';
import { PicksTable } from '@/components/picks-table';
import { Filters } from '@/components/filters';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const filters = {
    source: typeof searchParams.source === 'string' ? searchParams.source : undefined,
    competition: typeof searchParams.competition === 'string' ? searchParams.competition : undefined,
    result: typeof searchParams.result === 'string' ? searchParams.result : undefined,
    team: typeof searchParams.team === 'string' ? searchParams.team : undefined,
    date_from: typeof searchParams.date_from === 'string' ? searchParams.date_from : undefined,
    date_to: typeof searchParams.date_to === 'string' ? searchParams.date_to : undefined,
  };

  const picks = await fetchPicks(filters);

  // Gather distinct values for filter dropdowns
  const allPicks = await fetchPicks({});
  const sources = Array.from(new Set(allPicks.map((p) => p.source).filter(Boolean))) as string[];
  const competitions = Array.from(new Set(allPicks.map((p) => p.competition).filter(Boolean))) as string[];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Soccer Picks Tracker</h1>
      </div>

      <Filters sources={sources} competitions={competitions} />

      <PicksTable picks={picks} />

      {picks.length === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 py-16">
          <p className="text-lg font-medium text-slate-500">No picks yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Use the &quot;Add Pick&quot; button above to get started.
          </p>
        </div>
      )}
    </main>
  );
}
