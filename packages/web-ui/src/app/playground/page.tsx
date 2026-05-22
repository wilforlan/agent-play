import PlaygroundClient from "./playground-client";

const ENABLE_PLAYGROUND =
  process.env.NEXT_PUBLIC_ENABLE_NODE_PLAYGROUND === "1" ||
  process.env.NEXT_PUBLIC_ENABLE_NODE_PLAYGROUND === "true";

const ENABLE_IOS_DS =
  process.env.NEXT_PUBLIC_ENABLE_IOS_DS === "1" ||
  process.env.NEXT_PUBLIC_ENABLE_IOS_DS === "true";

export default function NodePlaygroundPage() {
  if (!ENABLE_PLAYGROUND) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#cbd5e1",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
        }}
      >
        Node Playground is currently disabled. Set
        {" "}
        <code>NEXT_PUBLIC_ENABLE_NODE_PLAYGROUND=true</code>
        {" "}
        to enable it.
      </div>
    );
  }

  return (
    <>
      {!ENABLE_IOS_DS ? (
        <div
          style={{
            margin: "8px 16px 0",
            padding: "8px 10px",
            borderRadius: "10px",
            border: "1px solid rgba(245, 158, 11, 0.45)",
            background: "rgba(120, 53, 15, 0.35)",
            color: "#fde68a",
            fontSize: 12,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
          }}
        >
          iOS design system rollout is disabled. Set
          {" "}
          <code>NEXT_PUBLIC_ENABLE_IOS_DS=true</code>
          {" "}
          to enable shared shell styling.
        </div>
      ) : null}
      <PlaygroundClient defaultServerUrl={process.env.NEXT_PUBLIC_SITE_ORIGIN ?? ""} />
    </>
  );
}
