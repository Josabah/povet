import { ImageResponse } from "next/og";

export const alt =
  "pov.et. Archive of everyday Ethiopian life.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "84px 96px",
          background: "#feffff",
          color: "#1d4351"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%"
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 42,
              letterSpacing: "-0.01em",
              color: "#1d4351"
            }}
          >
            pov.et
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#7aa6b5"
            }}
          >
            An archive in progress
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 168,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: "#1d4351"
            }}
          >
            Archive of everyday Ethiopian life.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              lineHeight: 1.4,
              color: "#34626f",
              maxWidth: 880
            }}
          >
            A quiet archive of everyday Ethiopian life, captured through phone
            photography.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            fontSize: 22,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#7aa6b5"
          }}
        >
          <div style={{ display: "flex" }}>Telegram · @pov_et</div>
          <div style={{ display: "flex" }}>Submit · @povetbot</div>
        </div>
      </div>
    ),
    size
  );
}
