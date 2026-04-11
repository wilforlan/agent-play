export function OgBrandImage() {
  const gridLine = "rgba(100, 116, 139, 0.12)";
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        position: "relative",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      {[80, 160, 240, 320, 400, 480, 560].map((top) => (
        <div
          key={top}
          style={{
            position: "absolute",
            left: 0,
            top,
            width: 1200,
            height: 1,
            background: gridLine,
          }}
        />
      ))}
      {[80, 240, 400, 560, 720, 880, 1040].map((left) => (
        <div
          key={`v-${left}`}
          style={{
            position: "absolute",
            left,
            top: 0,
            width: 1,
            height: 630,
            background: gridLine,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 132,
          top: 372,
          width: 96,
          height: 96,
          borderRadius: 48,
          background: "rgba(129, 140, 248, 0.35)",
          border: "2px solid #818cf8",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 284,
          top: 344,
          width: 72,
          height: 72,
          borderRadius: 36,
          background: "rgba(99, 102, 241, 0.25)",
          border: "2px solid rgba(129, 140, 248, 0.6)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 232,
          top: 452,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: "rgba(148, 163, 184, 0.2)",
          border: "2px solid #94a3b8",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "168px 80px 80px 420px",
          flex: 1,
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            padding: "10px 20px",
            borderRadius: 10,
            background: "rgba(51, 65, 85, 0.85)",
            border: "1px solid rgba(129, 140, 248, 0.45)",
            color: "#e2e8f0",
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 48,
          }}
        >
          Play · Chat · Assist
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#f1f5f9",
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          Agent Play
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#94a3b8",
            marginBottom: 16,
          }}
        >
          AI Agents · Game · Metaverse
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "#cbd5e1",
          }}
        >
          Free on every device
        </div>
      </div>
    </div>
  );
}
