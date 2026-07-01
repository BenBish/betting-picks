import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type DailyPnl,
  downloadCsv,
  getAnalytics,
  getAnalyticsByAgent,
  getAnalyticsByCompetition,
  getAnalyticsByMarket,
  getDailyPnL,
  getPicks,
  type Pick,
} from "../lib/api";

const _COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981"];

export function AnalyticsPage() {
  const { data: analytics, isLoading: loadingMain } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => getAnalytics(),
  });

  const { data: byAgent = [] } = useQuery({
    queryKey: ["analytics-by-agent"],
    queryFn: () => getAnalyticsByAgent(),
  });

  const { data: byMarket = [] } = useQuery({
    queryKey: ["analytics-by-market"],
    queryFn: () => getAnalyticsByMarket(),
  });

  const { data: dailyPnL = [] } = useQuery({
    queryKey: ["daily-pnl"],
    queryFn: () => getDailyPnL(),
  });

  const { data: byCompetition = [] } = useQuery({
    queryKey: ["analytics-by-competition"],
    queryFn: () => getAnalyticsByCompetition(),
  });

  const { data: allPicks = [] } = useQuery({
    queryKey: ["all-picks-analytics"],
    queryFn: () => getPicks(),
  });

  if (loadingMain) {
    return <div className="text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl">Analytics</h2>
        <Button onClick={downloadCsv} size="sm" variant="outline">
          <Download className="mr-1 size-4" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Picks" value={analytics?.total_picks ?? 0} />
        <StatCard label="Win Rate" value={`${analytics?.win_rate ?? 0}%`} />
        <StatCard
          label="ROI"
          positive={(analytics?.roi ?? 0) > 0}
          value={`${analytics?.roi ?? 0}%`}
        />
        <StatCard
          label="Total P/L"
          positive={(analytics?.total_profit_loss ?? 0) > 0}
          value={`${analytics?.total_profit_loss ?? 0}`}
        />
      </div>

      {/* Additional Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Settled" value={analytics?.settled_picks ?? 0} />
        <StatCard
          label="Avg CLV%"
          value={
            analytics && analytics.avg_clv_percent !== null
              ? `${analytics.avg_clv_percent}%`
              : "N/A"
          }
        />
        <StatCard label="Total Stake" value={analytics?.total_stake ?? 0} />
        <StatCard
          label="Won/Lost"
          value={`${analytics?.won_picks ?? 0}/${analytics?.lost_picks ?? 0}`}
        />
      </div>

      {/* Daily P&L Chart */}
      {dailyPnL.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Daily P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-64">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={dailyPnL}>
                  <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    stroke="#9ca3af"
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis fontSize={11} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      color: "#f3f4f6",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="profit_loss">
                    {dailyPnL.map((entry) => (
                      <Cell
                        fill={entry.profit_loss >= 0 ? "#10b981" : "#ef4444"}
                        key={entry.date}
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
            <CardTitle className="text-base md:text-lg">
              Cumulative P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-64">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={computeCumulativePnL(dailyPnL)}>
                  <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    stroke="#9ca3af"
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis fontSize={11} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      color: "#f3f4f6",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    dataKey="cumulative"
                    dot={false}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLV Distribution Histogram */}
      {allPicks.some((p) => p.clv_percent !== null) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              CLV% Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-64">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={computeClvHistogram(allPicks)}>
                  <CartesianGrid stroke="#333" strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" fontSize={11} stroke="#9ca3af" />
                  <YAxis fontSize={11} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      color: "#f3f4f6",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count">
                    {computeClvHistogram(allPicks).map((entry) => (
                      <Cell
                        fill={entry.bucket === "< 0%" ? "#ef4444" : "#10b981"}
                        key={entry.bucket}
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
                  {byAgent.map((a) => (
                    <TableRow key={a.agent_id || "manual"}>
                      <TableCell>{a.agent_name}</TableCell>
                      <TableCell className="text-right">
                        {a.total_picks}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.win_rate}%
                      </TableCell>
                      <TableCell
                        className={`text-right ${a.total_profit_loss >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {a.total_profit_loss.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.avg_clv_percent === null
                          ? "-"
                          : `${a.avg_clv_percent}%`}
                      </TableCell>
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
                  {byMarket.map((m) => (
                    <TableRow key={m.market}>
                      <TableCell>{m.market}</TableCell>
                      <TableCell className="text-right">
                        {m.total_picks}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.win_rate}%
                      </TableCell>
                      <TableCell
                        className={`text-right ${m.total_profit_loss >= 0 ? "text-success" : "text-destructive"}`}
                      >
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
              <CardTitle className="text-base md:text-lg">
                By Competition
              </CardTitle>
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
                  {byCompetition.map((comp) => (
                    <TableRow key={comp.competition || "Unknown"}>
                      <TableCell>{comp.competition || "Unknown"}</TableCell>
                      <TableCell className="text-right">
                        {comp.total_picks}
                      </TableCell>
                      <TableCell className="text-right">
                        {comp.win_rate}%
                      </TableCell>
                      <TableCell
                        className={`text-right ${comp.total_profit_loss >= 0 ? "text-success" : "text-destructive"}`}
                      >
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

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string | number;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-1">
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className={`mt-1 font-bold text-xl ${getStatColor(positive)}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function getStatColor(positive?: boolean): string {
  if (positive === true) {
    return "text-success";
  }
  if (positive === false) {
    return "text-destructive";
  }
  return "";
}

function computeCumulativePnL(
  dailyPnL: DailyPnl[]
): (DailyPnl & { cumulative: number })[] {
  let cumulative = 0;
  return dailyPnL.map((entry) => {
    cumulative += entry.profit_loss ?? 0;
    return { ...entry, cumulative: Math.round(cumulative * 100) / 100 };
  });
}

function computeClvHistogram(
  picks: Pick[]
): { bucket: string; count: number }[] {
  const buckets: Record<string, number> = {
    "< 0%": 0,
    "0-5%": 0,
    "5-10%": 0,
    "10-15%": 0,
    "> 15%": 0,
  };

  for (const p of picks) {
    if (p.clv_percent === null) {
      continue;
    }
    if (p.clv_percent < 0) {
      buckets["< 0%"]++;
    } else if (p.clv_percent < 5) {
      buckets["0-5%"]++;
    } else if (p.clv_percent < 10) {
      buckets["5-10%"]++;
    } else if (p.clv_percent < 15) {
      buckets["10-15%"]++;
    } else {
      buckets["> 15%"]++;
    }
  }

  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}
