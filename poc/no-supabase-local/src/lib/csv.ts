import { PickWithClv } from './picks-service';

export function generateCsv(picks: PickWithClv[]): string {
  const headers = [
    'id',
    'created_at',
    'updated_at',
    'created_by',
    'source',
    'match_date',
    'competition',
    'home_team',
    'away_team',
    'market',
    'selection',
    'recommended_odds',
    'closing_odds',
    'clv_percent',
    'stake',
    'result',
    'profit_loss',
    'notes',
  ];

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = picks.map((pick) =>
    headers.map((h) => {
      const key = h as keyof PickWithClv;
      const val = pick[key];
      if (key === 'clv_percent' && val !== null) {
        return escape(Number(val).toFixed(2));
      }
      return escape(val);
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
