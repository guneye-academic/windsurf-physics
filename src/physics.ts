export type Inputs = {
    trueWindSpeed: number;     // m/s
    courseAngleDeg: number;    // 0=downwind, 180=upwind (relative to true wind)
    boardSpeed: number;        // m/s

    sailArea: number;          // m^2
    sheetingDeg: number;       // sail angle relative to board centerline (deg)
    downhaul: number;          // 0..1 (more = flatter)
    outhaul: number;           // 0..1 (more = flatter)
};

export type Outputs = {
    apparentWindSpeed: number;      // m/s
    apparentWindAngleDeg: number;   // deg, relative to board forward axis (+ = from starboard)
    alphaDeg: number;               // effective angle of attack

    cl: number;
    cd: number;

    liftN: number;
    dragN: number;

    driveN: number; // +x component
    sideN: number;  // +y component
    powerW: number; // drive * boardSpeed

    Va_x: number;
    Va_y: number;
    L_x: number;
    L_y: number;
    D_x: number;
    D_y: number;
    F_x: number;
    F_y: number;

};

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function clamp(x: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, x));
}
function vecMag(x: number, y: number) {
    return Math.hypot(x, y);
}
function angleDegFromXY(x: number, y: number) {
    return Math.atan2(y, x) * RAD;
}

export function compute(inputs: Inputs): Outputs {
    // Board axes:
    // +x forward, +y starboard (right)
    const tw = inputs.trueWindSpeed;
    const course = inputs.courseAngleDeg * DEG;

    // True wind vector in board frame (wind velocity toward the board)
    // courseAngle: 180 => upwind => wind from ahead => +x
    // courseAngle: 0   => downwind => wind from behind => -x
    const Vw_x = tw * Math.cos(Math.PI - course);
    const Vw_y = tw * Math.sin(Math.PI - course);

    // Board velocity through water
    const Vb_x = inputs.boardSpeed;
    const Vb_y = 0;

    // Apparent wind = wind - board velocity
    const Va_x = Vw_x - Vb_x;
    const Va_y = Vw_y - Vb_y;

    const Va = vecMag(Va_x, Va_y);
    const awaDeg = angleDegFromXY(Va_x, Va_y);

    const sailAngleDeg = clamp(inputs.sheetingDeg, -85, 85);

    // alpha = wind angle - sail angle
    let alphaDeg = awaDeg - sailAngleDeg;
    while (alphaDeg > 180) alphaDeg -= 360;
    while (alphaDeg < -180) alphaDeg += 360;

    // Simple aero model with trim effects
    const rho = 1.225;
    const A = inputs.sailArea;

    const flatness = clamp(0.5 * inputs.downhaul + 0.5 * inputs.outhaul, 0, 1);

    const stallDeg = 18 - 5 * flatness;
    const clAlphaPerDeg = 0.11;
    const clMax = 1.2 - 0.4 * flatness;

    const alphaLin = clamp(alphaDeg, -stallDeg, stallDeg);
    let cl = clAlphaPerDeg * alphaLin;
    cl = clamp(cl, -clMax, clMax);

    const cd0 = 0.08 - 0.02 * flatness;
    const k = 0.06;
    const cd = cd0 + k * cl * cl;

    const q = 0.5 * rho * Va * Va;
    const liftN = q * A * cl;
    const dragN = q * A * cd;

    const eps = 1e-9;
    const ux = Va_x / (Va + eps);
    const uy = Va_y / (Va + eps);

    // Drag opposite apparent wind
    const D_x = -dragN * ux;
    const D_y = -dragN * uy;

    // Lift perpendicular to apparent wind, sign based on alpha
    const sign = alphaDeg >= 0 ? 1 : -1;
    const L_x = sign * liftN * (-uy);
    const L_y = sign * liftN * (ux);

    const F_x = L_x + D_x;
    const F_y = L_y + D_y;

    return {
        apparentWindSpeed: Va,
        apparentWindAngleDeg: awaDeg,
        alphaDeg,
        cl,
        cd,
        liftN,
        dragN,

        Va_x,
        Va_y,
        L_x,
        L_y,
        D_x,
        D_y,
        F_x,
        F_y,

        driveN: F_x,
        sideN: F_y,
        powerW: F_x * inputs.boardSpeed,
    };

}
