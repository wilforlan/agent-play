type OgV0peerWorldImageOptions = {
  worldIndex: number | null;
  variant: "main-world" | "convergence";
  title: string;
  description: string;
};

const CREAM = "#f3eee4";
const FOAM = "#fffaf1";
const INK = "#241e18";
const TEAL = "#3d6f70";
const CORAL = "#d97862";
const SAGE = "#7c9a86";
const WOOD = "#c4a574";

export function OgV0peerWorldImage(options: OgV0peerWorldImageOptions) {
  const { worldIndex, variant, title, description } = options;
  const kicker =
    worldIndex === null ? "V0PEER" : `WORLD ${String(worldIndex)}`;
  const flowLabel =
    variant === "convergence"
      ? "Walk → Talk / Earn → Bank / Peer stall"
      : "Walk · Talk · Assist · Arcade";

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: CREAM,
        position: "relative",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 420,
          height: 280,
          background: "rgba(217, 120, 98, 0.08)",
          borderRadius: "0 0 280px 0",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 480,
          height: 320,
          background: "rgba(61, 111, 112, 0.07)",
          borderRadius: "280px 0 0 0",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "64px 72px",
          flex: 1,
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            padding: "10px 18px",
            borderRadius: 999,
            background: FOAM,
            border: `1px solid rgba(36, 30, 24, 0.08)`,
            color: INK,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.22em",
            marginBottom: 36,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: INK,
            lineHeight: 1.1,
            marginBottom: 18,
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: TEAL,
            lineHeight: 1.35,
            marginBottom: 40,
            maxWidth: 920,
          }}
        >
          {description.length > 140
            ? `${description.slice(0, 137)}…`
            : description}
        </div>
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: FOAM,
              border: `2px solid ${TEAL}`,
            }}
          />
          <div
            style={{
              flex: 1,
              height: 3,
              background: `linear-gradient(90deg, ${TEAL} 0%, ${CORAL} 100%)`,
              borderRadius: 2,
              maxWidth: 420,
            }}
          />
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: FOAM,
              border: `2px solid ${CORAL}`,
            }}
          />
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: INK,
              marginLeft: 8,
            }}
          >
            {flowLabel}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 28,
          }}
        >
          <div
            style={{
              width: 72,
              height: 10,
              borderRadius: 5,
              background: SAGE,
              opacity: 0.45,
            }}
          />
          <div
            style={{
              width: 56,
              height: 10,
              borderRadius: 5,
              background: WOOD,
              opacity: 0.45,
            }}
          />
          <div
            style={{
              width: 40,
              height: 10,
              borderRadius: 5,
              background: TEAL,
              opacity: 0.35,
            }}
          />
        </div>
      </div>
    </div>
  );
}
