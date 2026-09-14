import { useState } from "react";

/**
 * DomInspector
 *
 * Un inspecteur DOM pédagogique et bidirectionnel. À gauche, un rendu
 * visible (une petite carte). À droite, l'arbre HTML correspondant.
 * Survoler un élément d'un côté surligne son jumeau de l'autre côté ;
 * cliquer sur un nœud affiche ses détails (balise, attributs, texte) —
 * comme l'onglet Elements de DevTools, mais épuré pour l'apprentissage.
 *
 * Le DOM est décrit par une structure de données (TREE) plutôt que par
 * du vrai HTML : ça permet de relier chaque nœud rendu à son nœud d'arbre
 * par un identifiant partagé, et de garder le composant autonome.
 *
 * Usage (Astro island) :
 *   import DomInspector from "../components/DomInspector.jsx";
 *   <DomInspector client:visible />
 */

/* Arbre du document inspecté. Chaque nœud a un id unique. */
const TREE = {
  id: "article",
  tag: "article",
  attrs: { class: "carte" },
  children: [
    {
      id: "h2",
      tag: "h2",
      attrs: { class: "carte__titre" },
      text: "Boîte du parc Laurier",
    },
    {
      id: "p",
      tag: "p",
      attrs: { class: "carte__desc" },
      text: "12 livres · à 450 m",
    },
    {
      id: "ul",
      tag: "ul",
      attrs: { class: "carte__tags" },
      children: [
        { id: "li1", tag: "li", text: "roman" },
        { id: "li2", tag: "li", text: "essai" },
        { id: "li3", tag: "li", text: "BD" },
      ],
    },
    {
      id: "a",
      tag: "a",
      attrs: { href: "/boites/14", class: "carte__lien" },
      text: "Voir la boîte",
    },
  ],
};

/* Aplatir l'arbre pour retrouver un nœud par id */
function flatten(node, acc = {}, parent = null, depth = 0) {
  acc[node.id] = { ...node, parent, depth };
  (node.children || []).forEach((c) => flatten(c, acc, node.id, depth + 1));
  return acc;
}
const FLAT = flatten(TREE);

export default function DomInspector() {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const active = hovered || selected;

  /* ── Rendu visible (gauche) ─────────────────────────── */
  function renderVisual() {
    const hl = (id) => ({
      outline: active === id ? "2px solid #0d9488" : "2px solid transparent",
      outlineOffset: "2px",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "outline-color 0.15s",
    });
    const bind = (id) => ({
      onMouseEnter: () => setHovered(id),
      onMouseLeave: () => setHovered(null),
      onClick: () => setSelected(id),
      style: hl(id),
    });

    return (
      <div className="di-card" {...bind("article")}>
        <h3 className="di-card__titre" {...bind("h2")}>Boîte du parc Laurier</h3>
        <p className="di-card__desc" {...bind("p")}>12 livres · à 450 m</p>
        <ul className="di-card__tags" {...bind("ul")}>
          <li {...bind("li1")}>roman</li>
          <li {...bind("li2")}>essai</li>
          <li {...bind("li3")}>BD</li>
        </ul>
        <a className="di-card__lien" {...bind("a")} onClick={(e) => { e.preventDefault(); setSelected("a"); }}>
          Voir la boîte
        </a>
      </div>
    );
  }

  /* ── Arbre HTML (droite) ────────────────────────────── */
  function renderNode(node, depth = 0) {
    const n = FLAT[node.id];
    const isActive = active === node.id;
    const pad = { paddingLeft: depth * 16 + 8 + "px" };
    const rowClass = "di-row" + (isActive ? " di-row--active" : "");
    const bind = {
      onMouseEnter: () => setHovered(node.id),
      onMouseLeave: () => setHovered(null),
      onClick: () => setSelected(node.id),
    };

    const attrsStr = node.attrs
      ? Object.entries(node.attrs).map(([k, v]) => (
          <span key={k}>
            {" "}
            <span className="di-attr-name">{k}</span>
            <span className="di-punct">=</span>
            <span className="di-attr-val">"{v}"</span>
          </span>
        ))
      : null;

    const hasChildren = node.children && node.children.length > 0;

    if (!hasChildren) {
      // Nœud feuille : <tag>texte</tag> sur une ligne
      return (
        <div key={node.id} className={rowClass} style={pad} {...bind}>
          <span className="di-punct">&lt;</span>
          <span className="di-tag">{node.tag}</span>
          {attrsStr}
          <span className="di-punct">&gt;</span>
          {node.text && <span className="di-text">{node.text}</span>}
          <span className="di-punct">&lt;/</span>
          <span className="di-tag">{node.tag}</span>
          <span className="di-punct">&gt;</span>
        </div>
      );
    }

    // Nœud avec enfants : balise ouvrante, enfants indentés, balise fermante
    return (
      <div key={node.id}>
        <div className={rowClass} style={pad} {...bind}>
          <span className="di-punct">&lt;</span>
          <span className="di-tag">{node.tag}</span>
          {attrsStr}
          <span className="di-punct">&gt;</span>
        </div>
        {node.children.map((c) => renderNode(c, depth + 1))}
        <div className={rowClass} style={pad} {...bind}>
          <span className="di-punct">&lt;/</span>
          <span className="di-tag">{node.tag}</span>
          <span className="di-punct">&gt;</span>
        </div>
      </div>
    );
  }

  /* ── Panneau de détails ─────────────────────────────── */
  function renderDetails() {
    if (!selected) {
      return (
        <div className="di-details di-details--empty">
          Survolez un élément pour le repérer des deux côtés. Cliquez pour voir ses détails.
        </div>
      );
    }
    const n = FLAT[selected];
    const chemin = [];
    let cur = n;
    while (cur) {
      chemin.unshift(cur.tag);
      cur = cur.parent ? FLAT[cur.parent] : null;
    }

    return (
      <div className="di-details">
        <div className="di-details__row">
          <span className="di-details__label">Balise</span>
          <code className="di-details__tag">&lt;{n.tag}&gt;</code>
        </div>
        <div className="di-details__row">
          <span className="di-details__label">Chemin</span>
          <code className="di-details__path">{chemin.join(" › ")}</code>
        </div>
        {n.attrs && (
          <div className="di-details__row">
            <span className="di-details__label">Attributs</span>
            <div className="di-details__attrs">
              {Object.entries(n.attrs).map(([k, v]) => (
                <div key={k} className="di-attr-chip">
                  <span className="di-attr-name">{k}</span>
                  <span className="di-punct">=</span>
                  <span className="di-attr-val">"{v}"</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {n.text && (
          <div className="di-details__row">
            <span className="di-details__label">Contenu</span>
            <span className="di-details__text">"{n.text}"</span>
          </div>
        )}
        <div className="di-details__row">
          <span className="di-details__label">Sélecteur</span>
          <code className="di-details__sel">
            {n.attrs?.class ? "." + n.attrs.class.split(" ")[0] : n.tag}
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="di">
      <style>{CSS}</style>
      <div className="di-grid">
        <div className="di-pane">
          <div className="di-pane__head"><i></i>Rendu</div>
          <div className="di-visual">{renderVisual()}</div>
        </div>
        <div className="di-pane">
          <div className="di-pane__head">Arbre DOM</div>
          <div className="di-tree">{renderNode(TREE)}</div>
        </div>
      </div>
      {renderDetails()}
    </div>
  );
}

const CSS = `
.di {
  --di-accent: #0d9488;
  --di-b: #e2e0db; --di-bg: #fff; --di-raised: #f8f7f4;
  --di-text: #1a1a2e; --di-mut: #6b6b80;
  font-family: 'DM Sans', system-ui, sans-serif;
  color: var(--di-text);
  border: 1px solid var(--di-b);
  border-radius: 16px;
  padding: 18px;
  background: var(--di-bg);
  max-width: 760px;
  margin: 2rem auto;
}
.di * { box-sizing: border-box; }

.di-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.di-pane {
  border: 1px solid var(--di-b);
  border-radius: 12px;
  overflow: hidden;
  background: var(--di-raised);
}
.di-pane__head {
  font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--di-mut);
  padding: 8px 12px; border-bottom: 1px solid var(--di-b);
  background: var(--di-bg);
}

/* Rendu visible */
.di-visual { padding: 16px; display: flex; align-items: center; justify-content: center; min-height: 200px; }
.di-card {
  background: var(--di-bg); border: 1px solid var(--di-b);
  border-radius: 10px; padding: 14px 16px; width: 100%; max-width: 230px;
}
.di-card__titre { font-size: 1rem; font-weight: 700; margin: 0 0 4px; font-family: 'Fraunces', serif; }
.di-card__desc { font-size: 0.82rem; color: var(--di-mut); margin: 0 0 10px; }
.di-card__tags { display: flex; gap: 6px; list-style: none; padding: 0; margin: 0 0 12px; flex-wrap: wrap; }
.di-card__tags li {
  font-size: 0.72rem; padding: 2px 9px; border-radius: 100px;
  background: color-mix(in srgb, var(--di-accent) 12%, transparent);
  color: var(--di-accent); font-weight: 600;
}
.di-card__lien {
  font-size: 0.82rem; font-weight: 600; color: var(--di-accent);
  text-decoration: none; display: inline-block;
}

/* Arbre DOM */
.di-tree {
  padding: 10px 4px; font-family: 'JetBrains Mono', monospace;
  font-size: 0.76rem; line-height: 1.5; overflow-x: auto;
  font-variant-ligatures: none;
}
.di-row {
  padding: 1px 8px; cursor: pointer; white-space: nowrap;
  border-radius: 4px; transition: background 0.12s;
}
.di-row:hover { background: color-mix(in srgb, var(--di-accent) 8%, transparent); }
.di-row--active { background: color-mix(in srgb, var(--di-accent) 16%, transparent); }
.di-tag { color: #d4537e; }
.di-attr-name { color: #ba7517; }
.di-attr-val { color: #1d9e75; }
.di-punct { color: var(--di-mut); }
.di-text { color: var(--di-text); }

/* Détails */
.di-details {
  margin-top: 14px; padding: 14px 16px;
  border: 1px solid var(--di-b); border-radius: 12px;
  background: var(--di-raised);
}
.di-details--empty {
  color: var(--di-mut); font-size: 0.85rem; font-style: italic; text-align: center;
}
.di-details__row {
  display: grid; grid-template-columns: 90px 1fr; gap: 12px;
  align-items: baseline; padding: 5px 0;
}
.di-details__row + .di-details__row { border-top: 1px solid var(--di-b); }
.di-details__label {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--di-mut);
}
.di-details__tag, .di-details__path, .di-details__sel {
  font-family: 'JetBrains Mono', monospace; font-size: 0.82rem;
  font-variant-ligatures: none;
}
.di-details__tag { color: #d4537e; }
.di-details__path { color: var(--di-mut); }
.di-details__sel {
  color: var(--di-accent); background: color-mix(in srgb, var(--di-accent) 10%, transparent);
  padding: 2px 8px; border-radius: 5px;
}
.di-details__attrs { display: flex; flex-direction: column; gap: 4px; }
.di-attr-chip { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; font-variant-ligatures: none; }
.di-details__text { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--di-text); }

@media (max-width: 600px) {
  .di-grid { grid-template-columns: 1fr; }
  .di-details__row { grid-template-columns: 1fr; gap: 2px; }
}
`;