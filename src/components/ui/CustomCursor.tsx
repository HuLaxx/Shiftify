"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
    const [isVisible, setIsVisible] = useState(false);
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    const springConfig = { damping: 25, stiffness: 700 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
            setIsVisible(true);
        };

        const handleMouseDown = () => document.body.classList.add("cursor-clicking");
        const handleMouseUp = () => document.body.classList.remove("cursor-clicking");

        window.addEventListener("mousemove", moveCursor);
        window.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", moveCursor);
            window.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [cursorX, cursorY]);

    if (!isVisible) return null;

    return (
        <>
            <motion.div
                className="cursor-dot fixed top-0 left-0 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
                style={{
                    translateX: cursorX,
                    translateY: cursorY,
                    x: "-50%",
                    y: "-50%",
                    width: 8,
                    height: 8,
                }}
            />
            <motion.div
                className="cursor-outline fixed top-0 left-0 border border-white rounded-full pointer-events-none z-[9999] opacity-50 mix-blend-difference"
                style={{
                    translateX: cursorXSpring,
                    translateY: cursorYSpring,
                    x: "-50%",
                    y: "-50%",
                    width: 40,
                    height: 40,
                }}
            />
            <style jsx global>{`
        body {
          cursor: none;
        }
        a, button, [role="button"] {
          cursor: none;
        }
        .cursor-clicking .cursor-outline {
          transform: translate(-50%, -50%) scale(0.8);
          background-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </>
    );
}
