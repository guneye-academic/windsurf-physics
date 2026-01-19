import type { Inputs } from "./physics";

export type Preset = {
    name: string;
    createdAt: string; // ISO
    inputs: Inputs;
};

const STORAGE_KEY = "windsurf_presets_v1";

export function loadPresets(): Preset[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Preset[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(p => p && typeof p.name === "string" && p.inputs);
    } catch {
        return [];
    }
}

export function savePresets(presets: Preset[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function upsertPreset(name: string, inputs: Inputs): Preset[] {
    const presets = loadPresets();
    const now = new Date().toISOString();

    const trimmed = name.trim();
    if (!trimmed) return presets;

    const idx = presets.findIndex(p => p.name.toLowerCase() === trimmed.toLowerCase());
    const next: Preset = { name: trimmed, createdAt: now, inputs };

    if (idx >= 0) {
        presets[idx] = next;
        savePresets(presets);
        return presets;
    }

    const out = [next, ...presets].slice(0, 50); // cap for sanity
    savePresets(out);
    return out;
}

export function deletePreset(name: string): Preset[] {
    const presets = loadPresets().filter(p => p.name !== name);
    savePresets(presets);
    return presets;
}

export function exportPresetsJson(): string {
    return JSON.stringify(loadPresets(), null, 2);
}

export function importPresetsJson(text: string): Preset[] {
    const parsed = JSON.parse(text) as Preset[];
    if (!Array.isArray(parsed)) throw new Error("JSON must be an array of presets.");
    // light validation
    for (const p of parsed) {
        if (!p || typeof p.name !== "string" || !p.inputs) {
            throw new Error("Invalid preset structure.");
        }
    }
    savePresets(parsed.slice(0, 200));
    return loadPresets();
}
