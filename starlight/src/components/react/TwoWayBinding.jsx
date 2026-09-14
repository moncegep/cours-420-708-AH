import { useState } from "react";

/**
 * TwoWayBinding (îlot Astro, hydraté client:visible)
 *
 * Compare la liaison unidirectionnelle (état vers vue) et bidirectionnelle
 * (état et vue synchronisés). Le « modèle » est la source de vérité. En mode
 * two-way, la vue lit et écrit l'état : taper dans la vue met tout à jour.
 * En mode one-way, la vue est en lecture seule : elle reflète l'état mais ne
 * peut pas le modifier. Un aperçu et un extrait de code accompagnent chaque mode.
 */

export default function TwoWayBinding() {
  const [valeur, setValeur] = useState("Lino");
  const [mode, setMode] = useState("two-way");
  const twoWay = mode === "two-way";

  return (
    <div className="tw">
      <div className="tw-modes" role="tablist" aria-label="Mode de liaison">
        <button role="tab" aria-selected={twoWay} className={`tw-mode ${twoWay ? "on" : ""}`}
          onClick={() => setMode("two-way")}>Bidirectionnelle (two-way)</button>
        <button role="tab" aria-selected={!twoWay} className={`tw-mode ${!twoWay ? "on" : ""}`}
          onClick={() => setMode("one-way")}>Unidirectionnelle (one-way)</button>
      </div>

      <div className="tw-flow" aria-hidden="true">
        <span className="tw-node">état</span>
        <span className="tw-arrow">{twoWay ? "\u21c4" : "\u2192"}</span>
        <span className="tw-node">vue</span>
      </div>

      <div className="tw-grid">
        <div className="tw-pane">
          <div className="tw-head">Modèle (état) · source</div>
          <input className="tw-input" value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            aria-label="Modèle, source de vérité" />
          <div className="tw-quick">
            {["Ada", "Wei", "Sara", ""].map((v) => (
              <button key={v || "vide"} className="tw-chip" onClick={() => setValeur(v)}>
                {v || "(vide)"}
              </button>
            ))}
          </div>
        </div>

        <div className="tw-pane">
          <div className="tw-head">Vue {twoWay ? "(lecture et écriture)" : "(lecture seule)"}</div>
          <input
            className={`tw-input ${twoWay ? "" : "ro"}`}
            value={valeur}
            onChange={twoWay ? (e) => setValeur(e.target.value) : undefined}
            readOnly={!twoWay}
            aria-label="Vue liée à l'état" />
          <p className="tw-note" role="status">
            {twoWay
              ? "Les deux champs écrivent dans l'état : modifier l'un met à jour l'autre et l'aperçu."
              : "La vue reflète l'état mais ne peut pas le modifier. Essayez de taper ici : rien ne change."}
          </p>
        </div>
      </div>

      <div className="tw-preview">
        <span className="tw-preview__label">Aperçu</span>
        <span className="tw-preview__text">Bonjour, {valeur || "\u2026"} !</span>
      </div>

      <pre className="tw-code"><code>{twoWay
        ? "champ.addEventListener(\"input\", e => setValeur(e.target.value)); // vue -> \u00e9tat\nfonctionRendu();                                                  // \u00e9tat -> vue"
        : "fonctionRendu(); // \u00e9tat -> vue seulement ; la vue ne r\u00e9\u00e9crit pas l'\u00e9tat"}</code></pre>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.tw {
  --accent:#0d9488; --b:#e2e0db; --bg:#fff; --raised:#f8f7f4;
  --text:#1a1a2e; --mut:#6b6b80;
  font-family:'DM Sans',system-ui,sans-serif; color:var(--text);
  border:1px solid var(--b); border-radius:16px; padding:18px;
  background:var(--bg); max-width:760px; margin:2rem auto;
}
.tw * { box-sizing:border-box; }
.tw-modes { display:inline-flex; gap:4px; padding:4px; background:var(--raised); border:1px solid var(--b); border-radius:10px; margin-bottom:14px; }
.tw-mode { border:0; background:transparent; color:var(--mut); font:inherit; font-size:0.82rem; font-weight:600; padding:6px 14px; border-radius:7px; cursor:pointer; }
.tw-mode.on { background:var(--bg); color:var(--accent); box-shadow:0 1px 2px rgba(0,0,0,0.06); }
.tw-mode:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
.tw-flow { display:flex; align-items:center; gap:12px; justify-content:center; margin:6px 0 16px; }
.tw-node { font-family:'JetBrains Mono',monospace; font-variant-ligatures:none; font-size:0.82rem; font-weight:600; padding:5px 14px; border:1px solid var(--accent); border-radius:8px; color:var(--accent); background:color-mix(in srgb, var(--accent) 8%, var(--bg)); }
.tw-arrow { font-size:1.4rem; color:var(--accent); font-weight:700; }
.tw-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.tw-pane { border:1px solid var(--b); border-radius:12px; padding:14px; background:var(--raised); }
.tw-head { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--mut); margin-bottom:9px; }
.tw-input { width:100%; font:inherit; font-size:0.95rem; padding:9px 11px; border:1px solid var(--b); border-radius:8px; background:var(--bg); color:var(--text); }
.tw-input:focus { outline:2px solid var(--accent); outline-offset:1px; border-color:var(--accent); }
.tw-input.ro { background:repeating-linear-gradient(45deg, var(--raised), var(--raised) 6px, var(--bg) 6px, var(--bg) 12px); color:var(--mut); cursor:not-allowed; }
.tw-quick { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
.tw-chip { border:1px solid var(--b); background:var(--bg); color:var(--text); font:inherit; font-size:0.76rem; padding:4px 10px; border-radius:20px; cursor:pointer; }
.tw-chip:hover { border-color:var(--accent); color:var(--accent); }
.tw-note { font-size:0.78rem; color:var(--mut); margin:10px 0 0; line-height:1.45; min-height:2.6em; }
.tw-preview { display:flex; align-items:center; gap:12px; margin-top:14px; padding:12px 16px; border:1px dashed var(--b); border-radius:10px; background:var(--raised); }
.tw-preview__label { font-size:0.66rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--mut); white-space:nowrap; }
.tw-preview__text { font-family:'Fraunces',serif; font-size:1.15rem; font-weight:600; }
.tw-code { margin:14px 0 0; background:#1a1a2e; color:#e8e8f0; border-radius:9px; padding:11px 14px; overflow-x:auto; }
.tw-code code { font-family:'JetBrains Mono',monospace; font-variant-ligatures:none; font-size:0.78rem; white-space:pre; }
@media (max-width:600px){ .tw-grid{ grid-template-columns:1fr; } }
[data-theme="dark"] .tw { --b:#2a3142; --bg:#10141d; --raised:#161b26; --text:#e8e8f0; --mut:#aeb6c4; }
[data-theme="dark"] .tw-mode.on { box-shadow:none; }
`;