import { useEffect, useRef } from "react";
import type { Inputs, Outputs } from "./physics";

type Props = { inputs: Inputs; out: Outputs };

function clamp(x: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, x));
}

export default function Viz({ inputs, out }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Handle HiDPI
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear
        ctx.clearRect(0, 0, cssW, cssH);

        // Layout
        const cx = cssW * 0.5;
        const cy = cssH * 0.55;
        const originX = cx;
        const originY = cy;

        // Helpers
        const drawLine = (x1: number, y1: number, x2: number, y2: number, w = 2) => {
            ctx.lineWidth = w;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        };

        const drawArrow = (x0: number, y0: number, x1: number, y1: number) => {
            const headLen = 10;
            const dx = x1 - x0;
            const dy = y1 - y0;
            const ang = Math.atan2(dy, dx);
            drawLine(x0, y0, x1, y1, 2);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 - headLen * Math.cos(ang - Math.PI / 6), y1 - headLen * Math.sin(ang - Math.PI / 6));
            ctx.lineTo(x1 - headLen * Math.cos(ang + Math.PI / 6), y1 - headLen * Math.sin(ang + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
        };

        const label = (text: string, x: number, y: number) => {
            ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
            ctx.fillText(text, x, y);
        };

        // Axes
        ctx.strokeStyle = "#111";
        ctx.fillStyle = "#111";
        drawArrow(originX, originY, originX + 120, originY); // +x forward
        drawArrow(originX, originY, originX, originY - 120); // -y up (screen), but our +y is right; just show axes visually
        label("+x forward", originX + 126, originY + 4);
        label("-screen y", originX + 6, originY - 126);

        // We will plot vectors in a consistent mapping:
        // physics: +x forward, +y starboard
        // screen: +x right, +y down
        // So mapping is: screenX = originX + scale * x, screenY = originY - scale * y (invert y)
        const toScreen = (x: number, y: number, scale: number) => ({
            sx: originX + scale * x,
            sy: originY - scale * y,
        });

        // Compute apparent wind vector (Va) from inputs and out
        // We can reconstruct from angle+speed:
        const awa = (out.apparentWindAngleDeg * Math.PI) / 180;
        const Va = out.apparentWindSpeed;
        const Va_x = Va * Math.cos(awa);
        const Va_y = Va * Math.sin(awa);

        // Force decomposition: we only have totals (drive/side) in board axes
        const F_x = out.driveN;
        const F_y = out.sideN;

        // Scaling (fit nicely)
        const windScale = 10; // pixels per (m/s)
        const forceScale = 0.15; // pixels per N (auto-clamp)
        const maxForceLen = 160;

        // Draw apparent wind (blue-ish via default stroke; we won't hardcode colors heavily)
        ctx.strokeStyle = "#0b5";
        ctx.fillStyle = "#0b5";
        const wEnd = toScreen(Va_x, Va_y, windScale);
        drawArrow(originX, originY, wEnd.sx, wEnd.sy);
        label(`Va ${Va.toFixed(2)} m/s`, wEnd.sx + 6, wEnd.sy + 6);

        // Draw resultant aero force
        const FxPix = clamp(F_x * forceScale, -maxForceLen, maxForceLen);
        const FyPix = clamp(F_y * forceScale, -maxForceLen, maxForceLen);

        ctx.strokeStyle = "#b50";
        ctx.fillStyle = "#b50";
        drawArrow(originX, originY, originX + FxPix, originY - FyPix);
        label(`F (drive/side)`, originX + FxPix + 6, originY - FyPix + 6);

        // Draw drive component (x only)
        ctx.strokeStyle = "#555";
        ctx.fillStyle = "#555";
        drawArrow(originX, originY, originX + FxPix, originY);
        label(`Drive ${out.driveN.toFixed(0)} N`, originX + FxPix + 6, originY - 6);

        // Draw side component (y only)
        drawArrow(originX, originY, originX, originY - FyPix);
        label(`Side ${out.sideN.toFixed(0)} N`, originX + 6, originY - FyPix - 6);

        // Text block
        ctx.fillStyle = "#111";
        label(`Course: ${inputs.courseAngleDeg.toFixed(0)} deg`, 12, 20);
        label(`Sheeting: ${inputs.sheetingDeg.toFixed(0)} deg`, 12, 38);
        label(`Alpha: ${out.alphaDeg.toFixed(1)} deg`, 12, 56);
    }, [inputs, out]);

    return (
        <div className="vizWrap">
            <canvas ref={canvasRef} className="vizCanvas" />
        </div>
    );
}
