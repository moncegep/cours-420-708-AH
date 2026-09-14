import { useState, useEffect, useRef } from "react";

/**
 * EventPropagation (îlot Astro, hydraté client:visible)
 *
 * Montre le cycle d'un événement à travers trois éléments imbriqués
 * (grand-parent, parent, enfant cible). Au clic sur l'enfant, la séquence
 * s'illumine dans l'ordre réel : phase de capture (du haut vers la cible),
 * phase cible, puis bouillonnement (de la cible vers le haut). Deux bascules :
 * activer les écouteurs en capture, et stopPropagation au parent.
 *
 * Accessibilité : la scène visuelle est aria-hidden ; une liste ordonnée
 * et une région role="status" donnent la séquence en texte. L'animation
 * respecte prefers-reduced-motion (séquence révélée d'un coup).
 */

const STEP_MS = 780;

const EL_LABEL = { grandparent: "grand-parent", parent: "parent", enfant: "enfant" };
const PHASE_LABEL = { capture: "capture", cible: "cible", bouillonnement: "bouillonnement" };

function buildSequence(captureOn, stopAtParent) {
  const seq = [];
  if (captureOn) {
    seq.push({ el: "grandparent", phase: "capture" });
    seq.push({ el: "parent", phase: "capture" });
  }
  seq.push({ el: "enfant", phase: "cible" });
  seq.push({ el: "parent", phase: "bouillonnement" });
  if (!stopAtParent) seq.push({ el: "grandparent", phase: "bouillonnement" });
  return seq;
}

export default function EventPropagation() {
  const [captureOn, setCaptureOn] = useState(false);
  const [stopAtParent, setStopAtParent] = useState(false);
  const [seq, setSeq] = useState([]);
  const [idx, setIdx] = useState(-1);
  const [reduced, setReduced] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(m.matches);
    apply();
    m.addEventListener?.("change", apply);
    return () => m.removeEventListener?.("change", apply);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  function reset() {
    clearTimeout(timer.current);
    setSeq([]);
    setIdx(-1);
  }

  function run() {
    clearTimeout(timer.current);
    const s = buildSequence(captureOn, stopAtParent);
    setSeq(s);
    if (reduced) { setIdx(s.length); return; }
    setIdx(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setIdx(i);
      if (i < s.length) timer.current = setTimeout(tick, STEP_MS);
    };
    timer.current = setTimeout(tick, STEP_MS);
  }

  const started = seq.length > 0;
  const finished = started && idx >= seq.length;
  const current = (!reduced && started && idx >= 0 && idx < seq.length) ? seq[idx] : null;

  function layerClass(key) {
    if (reduced && started) return seq.some((s) => s.el === key) ? "fired" : "";
    if (current && current.el === key) return "active";
    if (idx > 0 && seq.slice(0, idx).some((s) => s.el === key)) return "fired";
    return "";
  }

  const statusText = !started
    ? "Cliquez sur l'enfant pour lancer la propagation."
    : reduced
    ? `Séquence complète : ${seq.length} étapes.`
    : finished
    ? "Propagation terminée."
    : `Étape ${idx + 1} sur ${seq.length} : ${EL_LABEL[current.el]}, phase de ${PHASE_LABEL[current.phase]}.`;

  return (
    <div className="ev">
      <div className="ev-controls">
        <label className="ev-check">
          <input type="checkbox" checked={captureOn}
            onChange={(e) => { setCaptureOn(e.target.checked); reset(); }} />
          Écouteurs en phase de capture
        </label>
        <label className="ev-check">
          <input type="checkbox" checked={stopAtParent}
            onChange={(e) => { setStopAtParent(e.target.checked); reset(); }} />
          <code>stopPropagation()</code> au parent
        </label>
        <button className="ev-btn" onClick={run}>{started ? "Rejouer" : "Lancer"}</button>
      </div>

      <div className="ev-grid">
        <div className="ev-stage" aria-hidden="true">
          <div className={`ev-layer ev-gp ${layerClass("grandparent")}`}>
            <span className="ev-name">div.zone · grand-parent</span>
            <div className={`ev-layer ev-pa ${layerClass("parent")}`}>
              <span className="ev-name">div.carte · parent</span>
              <button className={`ev-target ${layerClass("enfant")}`} onClick={run}>
                button · enfant (cible)
              </button>
            </div>
          </div>
        </div>

        <div className="ev-side">
          <div className="ev-status" role="status">{statusText}</div>
          <ol className="ev-log">
            {seq.map((s, i) => {
              const state = reduced ? "done" : i < idx ? "done" : i === idx ? "now" : "todo";
              return (
                <li key={i} className={`ev-logitem ${state}`}>
                  <span className="ev-li-el">{EL_LABEL[s.el]}</span>
                  <span className={`ev-li-phase ph-${s.phase}`}>{PHASE_LABEL[s.phase]}</span>
                </li>
              );
            })}
            {!started && <li className="ev-logitem ev-empty">en attente d'un clic…</li>}
          </ol>
          <div className="ev-readout">
            <div><span className="ev-k">event.target</span><span className="ev-v">button (enfant)</span></div>
            <div><span className="ev-k">event.currentTarget</span><span className="ev-v">{current ? EL_LABEL[current.el] : (reduced && started ? "chaque couche" : "aucun")}</span></div>
          </div>
        </div>
      </div>

      <p className="ev-hint">La capture descend, du grand-parent vers la cible ; le bouillonnement remonte, de la cible vers le grand-parent. <code>event.target</code> reste l'élément cliqué ; <code>event.currentTarget</code> est celui qui traite l'événement à cet instant.</p>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.ev {
  --accent:#0d9488; --b:#e2e0db; --bg:#fff; --raised:#f8f7f4;
  --text:#1a1a2e; --mut:#6b6b80; --fired:#5eb5ac;
  font-family:'DM Sans',system-ui,sans-serif; color:var(--text);
  border:1px solid var(--b); border-radius:16px; padding:18px;
  background:var(--bg); max-width:780px; margin:2rem auto;
}
.ev * { box-sizing:border-box; }
.ev-controls { display:flex; flex-wrap:wrap; gap:14px; align-items:center; margin-bottom:16px; }
.ev-check { display:flex; align-items:center; gap:7px; font-size:0.85rem; color:var(--text); cursor:pointer; }
.ev-check input { accent-color:var(--accent); width:15px; height:15px; }
.ev-check code, .ev-hint code, .ev-li-phase { font-family:'JetBrains Mono',monospace; font-variant-ligatures:none; }
.ev-btn {
  margin-left:auto; border:1px solid var(--accent); background:var(--accent); color:#fff;
  font:inherit; font-size:0.85rem; font-weight:600; padding:7px 16px; border-radius:8px; cursor:pointer;
}
.ev-btn:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.ev-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.ev-stage { display:flex; align-items:center; justify-content:center; }
.ev-layer { position:relative; border:2px solid var(--b); border-radius:14px; padding:26px 16px 16px; width:100%; transition:border-color .2s, background .2s, box-shadow .2s; }
.ev-gp { background:var(--raised); }
.ev-pa { margin-top:8px; background:var(--bg); }
.ev-name {
  position:absolute; top:6px; left:12px; font-size:0.66rem; font-weight:700;
  text-transform:uppercase; letter-spacing:0.04em; color:var(--mut);
  font-family:'JetBrains Mono',monospace; font-variant-ligatures:none;
}
.ev-target {
  display:block; width:100%; margin-top:8px; border:2px solid var(--b); border-radius:10px;
  background:var(--raised); color:var(--text); font:inherit; font-size:0.82rem; font-weight:600;
  font-family:'JetBrains Mono',monospace; font-variant-ligatures:none;
  padding:14px 10px; cursor:pointer; transition:border-color .2s, background .2s, box-shadow .2s;
}
.ev-target:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.ev-layer.fired, .ev-target.fired { border-color:var(--fired); }
.ev-layer.active, .ev-target.active {
  border-color:var(--accent);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  background:color-mix(in srgb, var(--accent) 8%, var(--bg));
}
.ev-side { display:flex; flex-direction:column; gap:10px; }
.ev-status {
  font-size:0.82rem; color:var(--text); background:var(--raised);
  border:1px solid var(--b); border-radius:9px; padding:8px 11px; min-height:2.4em;
}
.ev-log { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:5px; counter-reset:s; }
.ev-logitem {
  display:flex; align-items:center; gap:9px; font-size:0.8rem;
  padding:6px 10px; border:1px solid var(--b); border-radius:8px; background:var(--bg);
  opacity:0.5; transition:opacity .2s, border-color .2s, background .2s; counter-increment:s;
}
.ev-logitem::before { content:counter(s); font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:var(--mut); min-width:1.1em; }
.ev-logitem.done { opacity:1; }
.ev-logitem.now { opacity:1; border-color:var(--accent); background:color-mix(in srgb, var(--accent) 8%, var(--bg)); }
.ev-empty { font-style:italic; color:var(--mut); opacity:0.8; }
.ev-empty::before { content:""; min-width:0; }
.ev-li-el { font-weight:600; }
.ev-li-phase { margin-left:auto; font-size:0.72rem; padding:2px 8px; border-radius:20px; }
.ph-capture { background:#e0f2fe; color:#075985; }
.ph-cible { background:#dcfce7; color:#166534; }
.ph-bouillonnement { background:#fef3c7; color:#92400e; }
.ev-readout { display:flex; flex-direction:column; gap:4px; margin-top:2px; }
.ev-readout > div { display:flex; justify-content:space-between; gap:10px; font-size:0.76rem; padding:3px 2px; border-bottom:1px solid var(--b); }
.ev-k { font-family:'JetBrains Mono',monospace; font-variant-ligatures:none; color:var(--mut); }
.ev-v { font-weight:600; text-align:right; }
.ev-hint { font-size:0.8rem; color:var(--mut); margin:14px 0 0; line-height:1.5; }
@media (max-width:600px){ .ev-grid{ grid-template-columns:1fr; } .ev-btn{ margin-left:0; } }
[data-theme="dark"] .ev { --b:#2a3142; --bg:#10141d; --raised:#161b26; --text:#e8e8f0; --mut:#aeb6c4; --fired:#3f7d76; }
[data-theme="dark"] .ev-btn { color:#0b0f16; }
[data-theme="dark"] .ph-capture { background:#0c2c3f; color:#7dd3fc; }
[data-theme="dark"] .ph-cible { background:#0f2e1d; color:#86efac; }
[data-theme="dark"] .ph-bouillonnement { background:#332306; color:#fcd34d; }
`;