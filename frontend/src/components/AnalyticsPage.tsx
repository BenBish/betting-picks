import { useQuery } from '@tanstack/react-query';
import { getAnalytics, getAnalyticsByAgent, getAnalyticsByMarket, getDailyPnL, downloadCsv } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'];

export function AnalyticsPage() {
  const { data: analytics, isLoading: loadingMain } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => getAnalytics(),
  });

  const { data: byAgent = [] } = useQuery({
    queryKey: ['analytics-by-agent'],
    queryFn: () => getAnalyticsByAgent(),
  });

  const { data: byMarket = [] } = useQuery({
    queryKey: ['analytics-by-market'],
    queryFn: () => getAnalyticsByMarket(),
  });

  const { data: dailyPnL = [] } = useQuery({
    queryKey: ['daily-pnl'],
    queryFn: () => getDailyPnL(),
  });

  if (loadingMain) {
    return (
      <div className="text-muted-foreground">Loading analytics...</div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <button
          onClick={downloadCsv}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Picks" value={analytics?.total_picks ?? 0} />
        <StatCard label="Win Rate" value={`${analytics?.win_rate ?? 0}%`} />
        <StatCard
          label="ROI"
          value={`${analytics?.roi ?? 0}%`}
          positive={(analytics?.roi ?? 0) > 0}
        />
        <StatCard
          label="Total P/L"
          value={`${analytics?.total_profit_loss ?? 0}`}
          positive={(analytics?.total_profit_loss ?? 0) > 0}
        />
      </div>

      {/* Additional Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Settled" value={analytics?.settled_picks ?? 0} />
        <StatCard label="Avg CLV%" value={analytics && analytics.avg_clv_percent !== null ? `${analytics.avg_clv_percent}%` : 'N/A'} />
        <StatCard label="Total Stake" value={analytics?.total_stake ?? 0} />
        <StatCard label="Won/Lost" value={`${analytics?.won_picks ?? 0}/${analytics?.lost_picks ?? 0}`} />
      </div>

      {/* Daily P&L Chart */}
      {dailyPnL.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-4 text-lg font-semibold">Daily P&L</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPnL}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f3f4f6' }}
                />
                <Bar dataKey="profit_loss">
                  {dailyPnL.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.profit_loss >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* By Agent & By Market */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* By Agent */}
        {byAgent.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 text-lg font-semibold">By Agent</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-muted-foreground">Agent</th>
                    <th className="pb-2 text-right text-muted-foreground">Picks</th>
                    <th className="pb-2 text-right text-muted-foreground">Win Rate</th>
                    <th className="pb-2 text-right text-muted-foreground">P/L</th>
                    <th className="pb-2 text-right text-muted-foreground">CLV%</th>
                  </tr>
                </thead>
                <tbody>
                  {byAgent.map((a: any) => (
                    <tr key={a.agent_id || 'manual'} className="border-b border-border/50">
                      <td className="py-2">{a.agent_name}</td>
                      <td className="py-2 text-right">{a.total_picks}</td>
                      <td className="py-2 text-right">{a.win_rate}%</td>
                      <td className={`py-2 text-right ${a.total_profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {a.total_profit_loss.toFixed(2)}
                      </td>
                      <td className="py-2 text-right">{a.avg_clv_percent !== null ? `${a.avg_clv_percent}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Market */}
        {byMarket.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-4 text-lg font-semibold">By Market</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-muted-foreground">Market</th>
                    <th className="pb-2 text-right text-muted-foreground">Picks</th>
                    <th className="pb-2 text-right text-muted-foreground">Win Rate</th>
                    <th className="pb-2 text-right text-muted-foreground">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {byMarket.map((m: any) => (
                    <tr key={m.market} className="border-b border-border/50">
                      <td className="py-2">{m.market}</td>
                      <td className="py-2 text-right">{m.total_picks}</td>
                      <td className="py-2 text-right">{m.win_rate}%</td>
                      <td className={`py-2 text-right ${m.total_profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {m.total_profit_loss.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, positive }: { label: string; value: string | number; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold ${positive === true ? 'text-success' : positive === false ? 'text-destructive' : ''}`}>
        {value}
      </div>
    </div>
  );
}
