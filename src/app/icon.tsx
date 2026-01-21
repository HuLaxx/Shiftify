import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
    width: 32,
    height: 32,
};
export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                }}
            >
                {/* Outer container (White box with shadow) mocking AnimatedLogo */}
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        background: "white",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Inner Gradient Fill (Blue -> Fuchsia) */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(135deg, #1e3a8a, #701a75)",
                            opacity: 0.9,
                        }}
                    />

                    {/* Flame Icon */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="white"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ zIndex: 10, color: "white" }}
                    >
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-4-2.072-5.5C7.928 2 9.928 2 12 2c2.072 0 4.072 2 5 3.5 1.072 1.928 1 3.928 0 6" />
                    </svg>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
