import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CategoryTrend } from '../shared/types'
import { formatCurrency, formatMonthLabel } from '../client/format'

const COLORS = [
  '#bf6f43', '#6b5748', '#3d2d1f', '#9a8478', '#1e1410',
  '#c48a5e', '#8c6a52', '#4a3828', '#a89078', '#7a5e44',
]

export function DashboardCharts({
  trend,
  categoryTrends,
}: {
  trend: Array<{ month: string; totalCents: number }>
  categoryTrends: CategoryTrend[]
}) {
  const totalData = trend.map((item) => ({
    month: item.month,
    totalCents: Math.abs(item.totalCents) / 100,
    label: formatMonthLabel(item.month),
  })).reverse()

  const allMonths = new Set<string>()
  for (const t of categoryTrends) {
    for (const m of t.monthlyAmounts) allMonths.add(m.month)
  }
  const sortedMonths = [...allMonths].sort()

  const categoryData = sortedMonths.map((month) => {
    const point: Record<string, string | number> = { month, label: formatMonthLabel(month) }
    for (const t of categoryTrends) {
      const amount = t.monthlyAmounts.find((m) => m.month === month)?.amountCents ?? 0
      point[t.categoryName] = Math.abs(amount) / 100
    }
    return point
  })

  const topCategories = categoryTrends.slice(0, Math.min(5, categoryTrends.length)).map((t) => t.categoryName)

  const formatDollar = (value: number | string) => formatCurrency(Math.round(Number(value) * 100))

  return (
    <div className="charts-surface">
      <section className="card chart-section">
        <div className="section-heading">
          <div>
            <p className="overline">Monthly trend</p>
            <h3>Total spend</h3>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={totalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,45,31,0.08)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b5748' }} />
            <YAxis tick={{ fontSize: 12, fill: '#6b5748' }} tickFormatter={formatDollar} />
            <Tooltip
              formatter={(value: unknown) => [formatDollar(String(value ?? 0)), 'Total'] as [string, string]}
              contentStyle={{ borderRadius: 0, border: '1px solid rgba(61,45,31,0.1)', background: '#faf8f4' }}
            />
            <Line
              type="monotone"
              dataKey="totalCents"
              stroke="#bf6f43"
              strokeWidth={2}
              dot={{ fill: '#bf6f43', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {categoryTrends.length > 0 && (
        <section className="card chart-section">
          <div className="section-heading">
            <div>
              <p className="overline">Category trends</p>
              <h3>Top categories over time</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(61,45,31,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b5748' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b5748' }} tickFormatter={formatDollar} />
              <Tooltip
                formatter={(value, name) => [formatDollar(String(value ?? 0)), String(name ?? '')] as [string, string]}
                contentStyle={{ borderRadius: 0, border: '1px solid rgba(61,45,31,0.1)', background: '#faf8f4' }}
              />
              <Legend />
              {topCategories.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  )
}
