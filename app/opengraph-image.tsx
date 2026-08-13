import { ImageResponse } from "next/og";

export const alt = "Nodability";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f7ea3 0%, #2f7d4f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          📝 Nodability
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            marginTop: 24,
            maxWidth: 900,
            color: "#e6f4ee",
          }}
        >
          AI-native personal task organizer
        </div>
      </div>
    ),
    { ...size }
  );
}
