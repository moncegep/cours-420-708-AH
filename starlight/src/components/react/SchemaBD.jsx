import { useState, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Schéma relationnel interactif
// ─────────────────────────────────────────────────────────────────────────────

const HEADER = 30;
const ROW = 26;
const VBW = 640;
const VBH = 410;

const tables = {
  produits: {
    w: 190, titre: 'produits',
    cols: [
      { nom: 'id', type: 'INT', pk: true },
      { nom: 'nom', type: 'VARCHAR' },
      { nom: 'prix', type: 'DECIMAL' },
    ],
  },
  commandes: {
    w: 190, titre: 'commandes',
    cols: [
      { nom: 'id', type: 'INT', pk: true },
      { nom: 'date', type: 'DATE' },
      { nom: 'client', type: 'VARCHAR' },
    ],
  },
  lignes_commande: {
    w: 210, titre: 'lignes_commande',
    cols: [
      { nom: 'id', type: 'INT', pk: true },
      { nom: 'commande_id', type: 'INT', fk: 'commandes' },
      { nom: 'produit_id', type: 'INT', fk: 'produits' },
      { nom: 'quantite', type: 'INT' },
    ],
  },
};

const hauteur = (t) => HEADER + t.cols.length * ROW;

const POS_DEFAUT = {
  produits: { x: 40, y: 40 },
  commandes: { x: 410, y: 40 },
  lignes_commande: { x: 215, y: 250 },
};

const relations = [
  { table: 'lignes_commande', ref: 'commandes' },
  { table: 'lignes_commande', ref: 'produits' },
];

const legendes = {
  produits: "produits contient le catalogue. Sa clé primaire id est référencée par lignes_commande.produit_id.",
  commandes: "commandes contient les commandes. Sa clé primaire id est référencée par lignes_commande.commande_id.",
  lignes_commande: "lignes_commande relie les deux autres tables : chaque ligne pointe vers un produit et vers une commande, par deux clés étrangères.",
};

const css = `
.sbd { border:1px solid var(--sl-color-gray-5, #e6e9ef); border-radius:12px; overflow:hidden;
  background:var(--sl-color-bg, #fff); margin:1.5rem 0; }
.sbd-head { padding:10px 14px; border-bottom:1px solid var(--sl-color-gray-5, #e6e9ef);
  background:var(--sl-color-gray-6, #f7f8fa); display:flex; align-items:center; justify-content:space-between; gap:10px; }
.sbd-title { font-size:14px; font-weight:700; letter-spacing:.03em; color:var(--sl-color-accent, #4f46e5); }
.sbd-reset { margin: 0; font-size:12px; font-weight:600; padding:5px 10px; border-radius:7px; cursor:pointer;
  border:1px solid var(--sl-color-gray-5, #d7dce6); background:transparent; color:var(--sl-color-gray-2, #515a6e); white-space:nowrap; }
.sbd-reset:hover { background:var(--sl-color-gray-6, #f1f2f6); }
.sbd-svg { display:block; width:100%; height:auto; touch-action:none; user-select:none; }
.sbd-tbl { transition:opacity .15s; }
.sbd-hname { font:700 13px 'Plus Jakarta Sans', system-ui, sans-serif; fill:#fff; }
.sbd-col { font:12px var(--sl-font-mono, 'Fira Code', monospace); fill:var(--sl-color-text, #2b3245); }
.sbd-type { font:11px var(--sl-font-mono, 'Fira Code', monospace); fill:var(--sl-color-gray-3, #94a3b8); }
.sbd-badge { font:700 9px 'Plus Jakarta Sans', system-ui, sans-serif; }
.sbd-cap { padding:10px 14px; border-top:1px solid var(--sl-color-gray-5, #e6e9ef);
  font-size:13px; line-height:1.5; color:var(--sl-color-text, #2b3245); min-height:1.5em; }
.sbd-legende { padding:8px 14px 0; display:flex; gap:14px; font-size:11px; color:var(--sl-color-gray-2, #515a6e); }
.sbd-key { display:inline-flex; align-items:center; gap:5px; }
.sbd-dot { width:10px; height:10px; border-radius:3px; display:inline-block; }
`;

export default function SchemaBD() {
  const [actif, setActif] = useState(null);
  const [pos, setPos] = useState(POS_DEFAUT);
  const svgRef = useRef(null);
  const drag = useRef(null);

  const ACCENT = 'var(--sl-color-accent, #4f46e5)';
  const FK = '#b45309';
  const BORD = 'var(--sl-color-gray-5, #d7dce6)';

  const centre = (id) => {
    const t = tables[id];
    const p = pos[id];
    return [p.x + t.w / 2, p.y + hauteur(t) / 2];
  };

  const tableActive = (nom) => {
    if (!actif) return true;
    if (nom === actif) return true;
    return relations.some(
      (r) => (r.table === actif && r.ref === nom) || (r.ref === actif && r.table === nom)
    );
  };
  const relActive = (r) => !actif || r.table === actif || r.ref === actif;

  const versSvg = (e) => {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const onDown = (id, e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = versSvg(e);
    drag.current = {
      id,
      dx: p.x - pos[id].x,
      dy: p.y - pos[id].y,
      cx: e.clientX,
      cy: e.clientY,
      bouge: false,
    };
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    if (!d.bouge && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < 4) return;
    d.bouge = true;
    const p = versSvg(e);
    const t = tables[d.id];
    const nx = Math.max(0, Math.min(VBW - t.w, p.x - d.dx));
    const ny = Math.max(0, Math.min(VBH - hauteur(t), p.y - d.dy));
    setPos((prev) => ({ ...prev, [d.id]: { x: nx, y: ny } }));
  };

  const onUp = (id, e) => {
    const d = drag.current;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    if (d && !d.bouge) setActif(actif === id ? null : id);
    drag.current = null;
  };

  const Table = ({ id }) => {
    const t = tables[id];
    const { x, y } = pos[id];
    const h = hauteur(t);
    const surligne = tableActive(id);
    return (
      <g
        className="sbd-tbl"
        style={{ opacity: surligne ? 1 : 0.3, cursor: 'grab' }}
        onPointerDown={(e) => onDown(id, e)}
        onPointerMove={onMove}
        onPointerUp={(e) => onUp(id, e)}
      >
        <rect x={x} y={y} width={t.w} height={h} rx="7"
              fill="var(--sl-color-bg, #fff)" stroke={BORD} strokeWidth="1.5" />
        <path d={`M${x} ${y + 7} q0 -7 7 -7 h${t.w - 14} q7 0 7 7 v${HEADER - 7} h${-t.w} z`} fill={ACCENT} />
        <text x={x + t.w / 2} y={y + 20} textAnchor="middle" className="sbd-hname">{t.titre}</text>
        {t.cols.map((c, i) => {
          const cy = y + HEADER + i * ROW + ROW / 2;
          return (
            <g key={c.nom}>
              {i > 0 && (
                <line x1={x} y1={y + HEADER + i * ROW} x2={x + t.w} y2={y + HEADER + i * ROW}
                      stroke={BORD} strokeWidth="0.5" />
              )}
              {c.pk && <rect x={x + 8} y={cy - 7} width="18" height="14" rx="3" fill={ACCENT} />}
              {c.pk && <text x={x + 17} y={cy + 3} textAnchor="middle" className="sbd-badge" fill="#fff">PK</text>}
              {c.fk && <rect x={x + 8} y={cy - 7} width="18" height="14" rx="3" fill={FK} />}
              {c.fk && <text x={x + 17} y={cy + 3} textAnchor="middle" className="sbd-badge" fill="#fff">FK</text>}
              <text x={x + (c.pk || c.fk ? 32 : 12)} y={cy + 4} className="sbd-col">{c.nom}</text>
              <text x={x + t.w - 10} y={cy + 4} textAnchor="end" className="sbd-type">{c.type}</text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className="sbd">
      <style>{css}</style>
      <div className="sbd-head">
        <div>
          <div className="sbd-title">Schéma relationnel</div>
        </div>
        <button className="sbd-reset" onClick={() => { setPos(POS_DEFAUT); setActif(null); }}>
          Réorganiser
        </button>
      </div>

      <div className="sbd-legende">
        <span className="sbd-key"><span className="sbd-dot" style={{ background: ACCENT }} /> clé primaire (PK)</span>
        <span className="sbd-key"><span className="sbd-dot" style={{ background: FK }} /> clé étrangère (FK)</span>
      </div>

      <svg ref={svgRef} className="sbd-svg" viewBox={`0 0 ${VBW} ${VBH}`}
           xmlns="http://www.w3.org/2000/svg" role="img"
           aria-label="Schéma des tables produits, commandes et lignes_commande">
        {relations.map((r, i) => {
          const a = centre(r.table);
          const b = centre(r.ref);
          return (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                  stroke={relActive(r) ? FK : BORD}
                  strokeWidth={relActive(r) ? 2 : 1}
                  opacity={relActive(r) ? 1 : 0.3} />
          );
        })}
        <Table id="produits" />
        <Table id="commandes" />
        <Table id="lignes_commande" />
      </svg>

      <div className="sbd-cap">
        {actif ? legendes[actif] : 'Chaque ligne de lignes_commande relie une commande à un produit.'}
      </div>
    </div>
  );
}