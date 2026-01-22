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
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(135deg, #38bdf8, #a855f7, #f59e0b)",
                        borderRadius: "9px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "2px",
                        boxShadow: "0 0 10px rgba(59, 130, 246, 0.35)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "7px",
                            background: "linear-gradient(145deg, #0b0b12, #111827)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: "linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%)",
                            }}
                        />
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="none"
                        >
                            <defs>
                                <linearGradient id="pulse" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#38bdf8" />
                                    <stop offset="55%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#f59e0b" />
                                </linearGradient>
                            </defs>
                            <path d="M10 7.6L16.4 11.4L10 15.2V7.6Z" fill="url(#pulse)" />
                            <path
                                d="M4.6 15.5C6.8 12.6 9.3 11.1 12 11.1C14.7 11.1 17.2 12.6 19.4 15.5"
                                stroke="url(#pulse)"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                            />
                            <path
                                d="M7.3 15.5C8.7 13.8 10.2 13 12 13C13.8 13 15.3 13.8 16.7 15.5"
                                stroke="url(#pulse)"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
