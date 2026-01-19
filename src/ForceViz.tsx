import { useEffect, useRef } from "react";
import type { Outputs } from "./physics";

function drawArrow(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    label: string
) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;

    const ux = dx / len;
    const uy = dy / len;

    const head = 10;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * (ux - uy * 0.4), y1 - head * (uy + ux * 0.4));
    ctx.lineTo(x1 - head * (ux + uy * 0.4), y1 - head * (uy - ux * 0.4));
    ctx.closePath();
    ctx.fill();

    ctx.fillText(label, x1 + 6, y1 + 6);
}

export default function ForceViz({ out }: { out: Outputs }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;

        const W = c.width;
        const H = c.height;

        ctx.clearRect(0, 0, W, H);
        ctx.font = "12px system-ui";

        const cx = W / 2;
        const cy = H / 2;
        const margin = 30;

        // Raw vectors to consider
        const windWeight = 25;
        const forces = [
            { x: out.Va_x * windWeight, y: out.Va_y * windWeight },
            { x: out.L_x, y: out.L_y },
            { x: out.D_x, y: out.D_y },
            { x: out.F_x, y: out.F_y },
        ];

        const maxX = Math.max(...forces.map(v => Math.abs(v.x)), 1e-6);
        const maxY = Math.max(...forces.map(v => Math.abs(v.y)), 1e-6);

        const scale = Math.min(
            (W / 2 - margin) / maxX,
            (H / 2 - margin) / maxY
        );

        const map = (x: number, y: number) => ({
            x: cx + x * scale,
            y: cy - y * scale
        });

        // Axes
        ctx.strokeStyle = "#000";
        ctx.fillStyle = "#000";
        drawArrow(ctx, cx - 100, cy, cx + 140, cy, "+x forward");
        drawArrow(ctx, cx, cy + 100, cx, cy - 140, "+y starboard");

        // Apparent wind
        ctx.strokeStyle = "#2563eb";
        ctx.fillStyle = "#2563eb";
        const Va = map(out.Va_x * windWeight, out.Va_y * windWeight);
        drawArrow(ctx, cx, cy, Va.x, Va.y, "Va");

        // Lift
        ctx.strokeStyle = "#22c55e";
        ctx.fillStyle = "#22c55e";
        const L = map(out.L_x, out.L_y);
        drawArrow(ctx, cx, cy, L.x, L.y, "L");

        // Drag
        ctx.strokeStyle = "#ef4444";
        ctx.fillStyle = "#ef4444";
        const D = map(out.D_x, out.D_y);
        drawArrow(ctx, cx, cy, D.x, D.y, "D");

        // Resultant
        ctx.strokeStyle = "#000";
        ctx.fillStyle = "#000";
        const F = map(out.F_x, out.F_y);
        drawArrow(ctx, cx, cy, F.x, F.y, "F");

    }, [out]);

    return (
        <canvas
            ref={ref}
            width={520}
            height={360}
            style={{ width: "100%", border: "1px solid #ddd", borderRadius: 12 }}
        />
    );
}
