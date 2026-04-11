"use client";

import type { PlatformAnalyticsPayload } from "@/server/agent-play/platform-analytics-payload";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./stats-page.module.css";

const ACCENT = "#818cf8";
const MUTED = "#475569";

type StatsChartsProps = {
  data: PlatformAnalyticsPayload;
};

export function StatsCharts({ data }: StatsChartsProps) {
  const monthData = data.series.nodesCreatedByMonth.map((row) => ({
    period: row.period,
    count: row.count,
  }));

  const pieHistogram = [
    {
      name: "No agent nodes",
      value: data.agentsPerMainHistogram.mainsWithZeroAgentNodes,
    },
    {
      name: "One agent node",
      value: data.agentsPerMainHistogram.mainsWithOneAgentNode,
    },
    {
      name: "Two or more",
      value: data.agentsPerMainHistogram.mainsWithTwoOrMoreAgentNodes,
    },
  ];

  const pc = data.playerChain;
  const chainSummary = [
    { label: "Session events", value: String(pc.eventLogLength) },
    {
      label: "Merkle leaves",
      value: pc.merkleLeafCount === null ? "—" : String(pc.merkleLeafCount),
    },
    {
      label: "Snapshot occupants",
      value:
        pc.snapshotOccupantCount === null ? "—" : String(pc.snapshotOccupantCount),
    },
  ];

  return (
    <>
      <section className={styles.section} aria-labelledby="registrations-heading">
        <h2 id="registrations-heading" className={styles.sectionTitle}>
          Registrations by month
        </h2>
        <p id="registrations-note" className={styles.sectionNote}>
          {data.definitions.registrationsByMonth}
        </p>
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="period" stroke={MUTED} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis
                allowDecimals={false}
                stroke={MUTED}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="count" fill={ACCENT} name="Node auth rows" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="distribution-heading">
        <h2 id="distribution-heading" className={styles.sectionTitle}>
          Agent nodes per main account
        </h2>
        <p className={styles.sectionNote}>{data.definitions.agentNodesPerMainAccount}</p>
        <div className={styles.chartRow}>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieHistogram}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={96}
                  paddingAngle={2}
                >
                  {pieHistogram.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#475569" : index === 1 ? ACCENT : "#a5b4fc"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className={styles.cardTitle} style={{ textTransform: "none", letterSpacing: 0 }}>
              Player chain & world snapshot
            </h3>
            <ul style={{ margin: "12px 0 0", paddingLeft: "1.1rem", color: "#cbd5e1" }}>
              {chainSummary.map((row) => (
                <li key={row.label} style={{ marginBottom: 8 }}>
                  <strong style={{ color: "#f1f5f9" }}>{row.label}:</strong> {row.value}
                </li>
              ))}
              {pc.occupantKinds !== null ? (
                <li style={{ marginBottom: 8 }}>
                  <strong style={{ color: "#f1f5f9" }}>Occupants in snapshot:</strong>{" "}
                  {pc.occupantKinds.human} human, {pc.occupantKinds.agent} agent,{" "}
                  {pc.occupantKinds.mcp} MCP
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
