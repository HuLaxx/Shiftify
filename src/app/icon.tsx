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

                    {/* Flame Icon - Complete Lucide paths */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="white"
                        stroke="none"
                        style={{ zIndex: 10 }}
                    >
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.5-4.072.5-6 .5-1 1.5-2 2.5-2s2 1 2.5 2c1 1.928 1.572 3.857.5 6-.5 1-1 1.62-1 3a2.5 2.5 0 0 0 2.5 2.5" />
                        <path d="M12 22c4 0 7-2.5 7-6 0-1.5-.5-3-1.5-4.5-1.5-2.5-2.5-4-2.5-6 0-1.5.5-3 1.5-4.5C13.5 2.5 12.5 2 12 2s-1.5.5-5 4.5C6 7.5 5.5 9 5.5 10.5c0 2 1 3.5 2.5 6C7.5 18.5 7 20 7 21.5c0 .5 0 .5.5.5" />
                    </svg>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
