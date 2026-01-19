import { compute } from "./physics";
import type { Inputs } from "./physics";
import ForceViz from "./ForceViz";

import "./app.css";
import { useMemo, useState } from "react";

import { deletePreset, exportPresetsJson, importPresetsJson, loadPresets, upsertPreset } from "./presets";

function Slider(props: {
    label: string;
    value: number;
    setValue: (v: number) => void;
    min: number;
    max: number;
    step: number;
    unit?: string;
    hint?: string; // add this
}) {
    const { label, value, setValue, min, max, step, unit } = props;
    return (
        <div className="sliderRow">
            <div className="sliderLabel">
                <div className="sliderTitle">{label}</div>
                <div className="sliderValue">
                    {value.toFixed(step < 1 ? 1 : 0)}
                    {unit ? ` ${unit}` : ""}
                    {props.hint ? ` (${props.hint})` : ""}
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
            />
        </div>
    );
}

const MPS_TO_KT = 1.943844;
function mpsToKt(v: number) { return v * MPS_TO_KT; }
function fmt(n: number, digits = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toFixed(digits);
}

export default function App() {
    // Environment
    const [trueWindSpeed, setTrueWindSpeed] = useState(10);
    const [courseAngleDeg, setCourseAngleDeg] = useState(120);
    const [boardSpeed, setBoardSpeed] = useState(8);

    // Rig & trim
    const [sailArea, setSailArea] = useState(6.5);
    const [sheetingDeg, setSheetingDeg] = useState(20);
    const [downhaul, setDownhaul] = useState(0.4);
    const [outhaul, setOuthaul] = useState(0.3);

    const [presets, setPresets] = useState(loadPresets());
    const [selectedPreset, setSelectedPreset] = useState<string>("");
    const [presetName, setPresetName] = useState<string>("My preset");
    const [importText, setImportText] = useState<string>("");
    const [exportText, setExportText] = useState<string>("");

    //Speed
    const [waterC0, setWaterC0] = useState(30);   // N  (baseline drag)
    const [waterC2, setWaterC2] = useState(1.2);  // N/(m/s)^2 (quadratic drag)


    const inputs: Inputs = useMemo(
        () => ({
            trueWindSpeed,
            courseAngleDeg,
            boardSpeed,
            sailArea,
            sheetingDeg,
            downhaul,
            outhaul,
        }),
        [trueWindSpeed, courseAngleDeg, boardSpeed, sailArea, sheetingDeg, downhaul, outhaul]
    );

    const out = useMemo(() => compute(inputs), [inputs]);

    const topSpeed = useMemo(() => {
        // scan board speeds and find the largest V where drive >= waterDrag
        let best = 0;

        for (let V = 0; V <= 30; V += 0.1) { // 0..30 m/s (~58 kn)
            const outV = compute({ ...inputs, boardSpeed: V });

            const drive = Math.max(0, -outV.driveN);
            const waterDrag = waterC0 + waterC2 * V * V;

            if (drive >= waterDrag) best = V;
        }

        const waterAtBest = waterC0 + waterC2 * best * best;
        const outAtBest = compute({ ...inputs, boardSpeed: best });

        return {
            mps: best,
            kn: best * 1.943844,
            driveN: -outAtBest.driveN,
            waterDragN: waterAtBest,
        };
    }, [inputs, waterC0, waterC2]);

    function applyInputs(x: Inputs) {
        setTrueWindSpeed(x.trueWindSpeed);
        setCourseAngleDeg(x.courseAngleDeg);
        setBoardSpeed(x.boardSpeed);

        setSailArea(x.sailArea);
        setSheetingDeg(x.sheetingDeg);
        setDownhaul(x.downhaul);
        setOuthaul(x.outhaul);
    }


    return (
        <div className="page">
            <header className="header">
                <h1>Windsurf Physics (Part A)</h1>
                <div className="subtitle">Apparent wind + simplified sail forces (v1).</div>
            </header>

            <div className="grid">
                <section className="card">
                    <h2>Inputs</h2>

                    <h3>Presets</h3>

                    <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8 }}>
                            <input
                                value={presetName}
                                onChange={(e) => setPresetName(e.target.value)}
                                placeholder="Preset name"
                                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                            />
                            <button
                                onClick={() => {
                                    const next = upsertPreset(presetName, inputs);
                                    setPresets(next);
                                    setSelectedPreset(presetName.trim());
                                }}
                                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white", cursor: "pointer" }}
                            >
                                Save
                            </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 8 }}>
                            <select
                                value={selectedPreset}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setSelectedPreset(name);
                                    const p = presets.find(pp => pp.name === name);
                                    if (p) applyInputs(p.inputs);
                                }}
                                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
                            >
                                <option value="">-- select preset --</option>
                                {presets.map(p => (
                                    <option key={p.name} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={() => {
                                    const p = presets.find(pp => pp.name === selectedPreset);
                                    if (p) applyInputs(p.inputs);
                                }}
                                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white", cursor: "pointer" }}
                            >
                                Load
                            </button>

                            <button
                                onClick={() => {
                                    if (!selectedPreset) return;
                                    const next = deletePreset(selectedPreset);
                                    setPresets(next);
                                    setSelectedPreset("");
                                }}
                                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white", cursor: "pointer" }}
                            >
                                Delete
                            </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8 }}>
                            <button
                                onClick={() => setExportText(exportPresetsJson())}
                                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white", cursor: "pointer" }}
                            >
                                Export JSON
                            </button>

                            <button
                                onClick={() => {
                                    try {
                                        const next = importPresetsJson(importText);
                                        setPresets(next);
                                        setSelectedPreset("");
                                    } catch (err: any) {
                                        alert(err?.message ?? "Import failed.");
                                    }
                                }}
                                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white", cursor: "pointer" }}
                            >
                                Import JSON
                            </button>
                        </div>

                        <textarea
                            value={exportText}
                            onChange={(e) => setExportText(e.target.value)}
                            placeholder="Exported presets will appear here (copy/paste)."
                            rows={5}
                            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
                        />

                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder="Paste presets JSON here to import."
                            rows={5}
                            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", width: "100%", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
                        />
                    </div>


                    <h3>Environment</h3>
                    <Slider
                        label="True wind speed"
                        value={trueWindSpeed}
                        setValue={setTrueWindSpeed}
                        min={2}
                        max={20}
                        step={0.5}
                        unit="m/s"
                        hint={`${mpsToKt(trueWindSpeed).toFixed(1)} kn`}
                    />
                    <Slider label="Course angle (0=DW, 180=UW)" value={courseAngleDeg} setValue={setCourseAngleDeg} min={0} max={180} step={1} unit="deg" />
                    <Slider label="Board speed" value={boardSpeed} setValue={setBoardSpeed} min={0} max={18} step={0.5} unit="m/s" />
                    <h3>Board & water drag (simple)</h3>

                    <Slider
                        label="Water drag C0 (baseline)"
                        value={waterC0}
                        setValue={setWaterC0}
                        min={0}
                        max={200}
                        step={5}
                        unit="N"
                    />

                    <Slider
                        label="Water drag C2 (quadratic)"
                        value={waterC2}
                        setValue={setWaterC2}
                        min={0.0}
                        max={5.0}
                        step={0.1}
                        unit="N/(m/s)^2"
                    />

                    <h3>Rig & trim</h3>
                    <Slider label="Sail area" value={sailArea} setValue={setSailArea} min={3.0} max={10.0} step={0.1} unit="m2" />
                    <Slider label="Sheeting angle" value={sheetingDeg} setValue={setSheetingDeg} min={-60} max={60} step={1} unit="deg" />
                    <Slider label="Downhaul" value={downhaul} setValue={setDownhaul} min={0} max={1} step={0.01} />
                    <Slider label="Outhaul" value={outhaul} setValue={setOuthaul} min={0} max={1} step={0.01} />
                </section>

                <section className="card">
                    <h2>Telemetry</h2>

                    <div className="telemetry">
                        <div className="trow"><div className="k">Apparent wind speed</div><div className="v">{fmt(out.apparentWindSpeed, 2)} m/s</div></div>
                        <div className="trow"><div className="k">Apparent wind angle</div><div className="v">{fmt(out.apparentWindAngleDeg, 1)}deg</div></div>
                        <div className="trow"><div className="k">Effective AoA (alpha)</div><div className="v">{fmt(out.alphaDeg, 1)}deg</div></div>
                        <div className="trow"><div className="k">CL</div><div className="v">{fmt(out.cl, 3)}</div></div>
                        <div className="trow"><div className="k">CD</div><div className="v">{fmt(out.cd, 3)}</div></div>

                        <hr />

                        <div className="trow"><div className="k">Lift</div><div className="v">{fmt(out.liftN, 0)} N</div></div>
                        <div className="trow"><div className="k">Drag</div><div className="v">{fmt(out.dragN, 0)} N</div></div>
                        <div className="trow"><div className="k">Drive (forward)</div><div className="v">{fmt(out.driveN, 0)} N</div></div>
                        <div className="trow"><div className="k">Side force</div><div className="v">{fmt(out.sideN, 0)} N</div></div>
                        <div className="trow"><div className="k">Aero power</div><div className="v">{fmt(out.powerW, 0)} W</div></div>
                        <div className="trow">
                            <div className="k">Estimated top speed</div>
                            <div className="v">
                                {topSpeed.mps.toFixed(1)} m/s ({topSpeed.kn.toFixed(1)} kn)
                            </div>
                        </div>

                        <div className="trow">
                            <div className="k">At top speed: drive vs water drag</div>
                            <div className="v">
                                {topSpeed.driveN.toFixed(0)} N vs {topSpeed.waterDragN.toFixed(0)} N
                            </div>
                        </div>

                    </div>
                    <ForceViz out={out} />
                    <div className="note">
                        Next: we’ll add a canvas diagram (wind + force arrows) and presets.
                    </div>
                    

                </section>
            </div>
        </div>
    );
}
