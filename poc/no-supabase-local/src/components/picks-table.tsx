'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { PickWithClv } from '@/lib/picks-service';
import { deletePickAction } from '@/lib/server-actions';
import { PickForm } from './pick-form';
import { SettleDialog } from './settle-dialog';
import { ClosingOddsInput } from './closing-odds-input';

interface PicksTableProps {
  picks: PickWithClv[];
}

export function PicksTable({ picks }: PicksTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [settlingPick, setSettlingPick] = useState<PickWithClv | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'match_date', desc: false },
  ]);

  const columns: ColumnDef<PickWithClv>[] = [
    {
      accessorKey: 'match_date',
      header: 'Date',
      cell: ({ getValue }) => {
        const val = getValue() as string;
        return new Date(val).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      },
    },
    {
      accessorKey: 'competition',
      header: 'Competition',
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        return <span className="text-slate-500">{val || '—'}</span>;
      },
    },
    {
      accessorKey: 'home_team',
      header: 'Match',
      cell: ({ row }) => {
        const home = row.original.home_team;
        const away = row.original.away_team;
        return (
          <span className="font-medium text-slate-800">
            {home} <span className="text-slate-400">vs</span> {away}
          </span>
        );
      },
    },
    {
      accessorKey: 'market',
      header: 'Market',
    },
    {
      accessorKey: 'selection',
      header: 'Selection',
    },
    {
      accessorKey: 'recommended_odds',
      header: 'Rec Odds',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{(getValue() as number).toFixed(2)}</span>
      ),
    },
    {
      accessorKey: 'closing_odds',
      header: 'Closing',
      cell: ({ row }) => (
        <ClosingOddsInput
          pickId={row.original.id}
          currentOdds={row.original.closing_odds}
        />
      ),
    },
    {
      accessorKey: 'clv_percent',
      header: 'CLV %',
      cell: ({ getValue }) => {
        const val = getValue() as number | null;
        if (val === null)
          return <span className="text-slate-400 italic text-sm">—</span>;
        const cls = val >= 0 ? 'text-clv-positive' : 'text-clv-negative';
        return (
          <span className={`font-mono text-sm ${cls}`}>
            {val >= 0 ? '+' : ''}
            {val.toFixed(1)}%
          </span>
        );
      },
    },
    {
      accessorKey: 'stake',
      header: 'Stake',
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as number).toFixed(1)}</span>
      ),
    },
    {
      accessorKey: 'result',
      header: 'Result',
      cell: ({ row }) => {
        const result = row.original.result;
        const isSettled = result !== null;

        if (isSettled) {
          const colorMap: Record<string, string> = {
            won: 'bg-green-100 text-green-700',
            lost: 'bg-red-100 text-red-700',
            push: 'bg-slate-100 text-slate-700',
            void: 'bg-slate-100 text-slate-500',
          };
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorMap[result] || ''}`}
            >
              {result}
            </span>
          );
        }

        return (
          <button
            onClick={() => setSettlingPick(row.original)}
            className="rounded-full border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-600 hover:bg-amber-50"
          >
            Settle
          </button>
        );
      },
    },
    {
      accessorKey: 'profit_loss',
      header: 'P&L',
      cell: ({ getValue }) => {
        const val = getValue() as number | null;
        if (val === null)
          return <span className="text-slate-400 text-sm">—</span>;
        const cls = val >= 0 ? 'text-green-600' : 'text-red-600';
        return (
          <span className={`font-mono text-sm font-medium ${cls}`}>
            {val >= 0 ? '+' : ''}
            {val.toFixed(2)}
          </span>
        );
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        return <span className="text-sm text-slate-500">{val || '—'}</span>;
      },
    },
    {
      accessorKey: 'id',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={async () => {
            if (!confirm('Delete this pick?')) return;
            await deletePickAction(row.original.id);
          }}
          className="text-red-400 hover:text-red-600 text-xs"
          title="Delete pick"
        >
          🗑
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data: picks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  // Summary stats
  const settledPicks = picks.filter((p) => p.result !== null);
  const totalStaked = settledPicks.reduce((sum, p) => sum + p.stake, 0);
  const totalPnl = settledPicks.reduce(
    (sum, p) => sum + (p.profit_loss ?? 0),
    0
  );
  const winRate =
    settledPicks.length > 0
      ? ((settledPicks.filter((p) => p.result === 'won').length /
          settledPicks.length) *
        100)
      : 0;
  const avgClv =
    picks.filter((p) => p.clv_percent !== null).length > 0
      ? picks
          .filter((p) => p.clv_percent !== null)
          .reduce((sum, p) => sum + (p.clv_percent ?? 0), 0) /
        picks.filter((p) => p.clv_percent !== null).length
      : null;

  return (
    <div>
      {/* Summary bar */}
      {settledPicks.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total P&L</p>
            <p
              className={`text-xl font-bold font-mono ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {totalPnl >= 0 ? '+' : ''}
              {totalPnl.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-medium text-slate-500">Win Rate</p>
            <p className="text-xl font-bold text-slate-800">{winRate.toFixed(0)}%</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-medium text-slate-500">Avg CLV</p>
            <p
              className={`text-xl font-bold font-mono ${avgClv !== null ? (avgClv >= 0 ? 'text-green-600' : 'text-red-600') : 'text-slate-400'}`}
            >
              {avgClv !== null ? `${avgClv >= 0 ? '+' : ''}${avgClv.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs font-medium text-slate-500">Settled</p>
            <p className="text-xl font-bold text-slate-800">
              {settledPicks.length}/{picks.length}
            </p>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {picks.length} pick{picks.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <a
            href="/api/export"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </a>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Pick
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      <span className="text-slate-400">
                        {header.column.getIsSorted() === 'asc'
                          ? '↑'
                          : header.column.getIsSorted() === 'desc'
                            ? '↓'
                            : ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-sm text-slate-400"
                >
                  No picks found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showForm && <PickForm onClose={() => setShowForm(false)} />}
      {settlingPick && (
        <SettleDialog
          pick={settlingPick}
          onClose={() => setSettlingPick(null)}
        />
      )}
    </div>
  );
}
