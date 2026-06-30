import { useQuery } from '@tanstack/react-query';
import { getAnalytics, getAnalyticsByAgent, getAnalyticsByMarket, getAnalyticsByCompetition, getDailyPnL, downloadCsv, getPicks } from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Download } from 'lucide-react';

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

  const { data: byCompetition = [] } = useQuery({
    queryKey: ['analytics-by-competition'],
    queryFn: () => getAnalyticsByCompetition(),
  });

  const { data: allPicks = [] } = useQuery({
    queryKey: ['all-picks-analytics'],
    queryFn: () => getPicks(),
  });

  if (loadingMain) {
    return <div className="text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <Button variant="outline" size="sm" onClick={downloadCsv}>
          <Download className="mr-1 size-4" /> Export CSV
        </Button>
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Daily P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f3f4f6', fontSize: 12 }}
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
          </CardContent>
        </Card>
      )}

      {/* Cumulative P&L Chart */}
      {dailyPnL.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Cumulative P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={computeCumulativePnL(dailyPnL)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f3f4f6', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLV Distribution Histogram */}
      {allPicks.some((p: any) => p.clv_percent !== null) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">CLV% Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computeClvHistogram(allPicks)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="bucket" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f3f4f6', fontSize: 12 }}
                  />
                  <Bar dataKey="count">
                    {computeClvHistogram(allPicks).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.bucket === '< 0%' ? '#ef4444' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Agent, By Market, By Competition */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* By Agent */}
        {byAgent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">By Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Picks</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead className="text-right">CLV%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byAgent.map((a: any) => (
                    <TableRow key={a.agent_id || 'manual'}>
                      <TableCell>{a.agent_name}</TableCell>
                      <TableCell className="text-right">{a.total_picks}</TableCell>
                      <TableCell className="text-right">{a.win_rate}%</TableCell>
                      <TableCell className={`text-right ${a.total_profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {a.total_profit_loss.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{a.avg_clv_percent !== null ? `${a.avg_clv_percent}%` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* By Market */}
        {byMarket.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">By Market</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead className="text-right">Picks</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byMarket.map((m: any) => (
                    <TableRow key={m.market}>
                      <TableCell>{m.market}</TableCell>
                      <TableCell className="text-right">{m.total_picks}</TableCell>
                      <TableCell className="text-right">{m.win_rate}%</TableCell>
                      <TableCell className={`text-right ${m.total_profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {m.total_profit_loss.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* By Competition */}
        {byCompetition.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">By Competition</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competition</TableHead>
                    <TableHead className="text-right">Picks</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCompetition.map((comp: any) => (
                    <TableRow key={comp.competition || 'Unknown'}>
                      <TableCell>{comp.competition || 'Unknown'}</TableCell>
                      <TableCell className="text-right">{comp.total_picks}</TableCell>
                      <TableCell className="text-right">{comp.win_rate}%</TableCell>
                      <TableCell className={`text-right ${comp.total_profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {comp.total_profit_loss.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, positive }: { label: string; value: string | number; positive?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-xl font-bold ${positive === true ? 'text-success' : positive === false ? 'text-destructive' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function computeCumulativePnL(dailyPnL: any[]): any[] {
  let cumulative = 0;
  return dailyPnL.map((entry) => {
    cumulative += entry.profit_loss ?? 0;
    return { ...entry, cumulative: Math.round(cumulative * 100) / 100 };
  });
}

function computeClvHistogram(picks: any[]): any[] {
  const buckets: Record<string, number> = {
    '< 0%': 0,
    '0-5%': 0,
    '5-10%': 0,
    '10-15%': 0,
    '> 15%': 0,
  };

  picks.forEach((p: any) => {
    if (p.clv_percent === null) return;
    if (p.clv_percent < 0) buckets['< 0%']++;
    else if (p.clv_percent < 5) buckets['0-5%']++;
    else if (p.clv_percent < 10) buckets['5-10%']++;
    else if (p.clv_percent < 15) buckets['10-15%']++;
    else buckets['> 15%']++;
  });

  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}
