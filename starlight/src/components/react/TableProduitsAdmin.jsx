import { useState } from 'react';

// Aperçu d'interface : table d'administration des produits (CRUD).
// Démonstration : « Ajouter » et « Supprimer » modifient l'aperçu localement ;
// dans le vrai projet, ces actions passent par la base de données.

const INITIAUX = [
  { id: 1, nom: "Sirop d'érable 540 ml", prix: 14.5 },
  { id: 2, nom: "Beurre d'érable 250 g", prix: 9.95 },
  { id: 3, nom: 'Tire sur la neige', prix: 6 },
];

const prixQc = (p) => p.toFixed(2).replace('.', ',') + ' $';

const css = `
.ta-wrap { border:1px solid var(--sl-color-gray-5, #e6e9ef); border-radius:12px; overflow:hidden;
  background:var(--sl-color-bg, #fff); margin:1.5rem 0; }
.ta-head { margin: 0; padding:10px 14px; border-bottom:1px solid var(--sl-color-gray-5, #e6e9ef);
  background:var(--sl-color-gray-6, #f7f8fa); display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ta-title { font-size:14px; font-weight:700; letter-spacing:.03em; color:var(--sl-color-accent, #4f46e5); }
.ta-sub { font-size:12px; color:var(--sl-color-gray-3, #6b7280); margin-top:2px; }
.ta-btn { margin-top: 0; font:600 12px 'Plus Jakarta Sans', system-ui, sans-serif; border-radius:7px; padding:6px 11px; cursor:pointer; border:1px solid transparent; }
.ta-add { background:var(--sl-color-accent, #4f46e5); color:#fff; }
.ta-reset { background:transparent; border-color:var(--sl-color-gray-5, #d7dce6); color:var(--sl-color-gray-2, #515a6e); }
.ta-table { width:100%; border-collapse:collapse; font-size:13px; }
.ta-table th, .ta-table td { text-align:left; padding:9px 14px; border-bottom:1px solid var(--sl-color-gray-5, #eef0f4); }
.ta-table th { font:700 11px 'Plus Jakarta Sans', system-ui, sans-serif; text-transform:uppercase; letter-spacing:.04em;
  color:var(--sl-color-gray-3, #8a93a6); background:var(--sl-color-gray-6, #fafbfc); }
.ta-id, .ta-prix { font-family:'Fira Code', monospace; }
.ta-act { display:inline-flex; gap:6px; }
.ta-lien { margin-top: 0; font:600 12px 'Plus Jakarta Sans', system-ui, sans-serif; border:1px solid var(--sl-color-gray-5, #d7dce6);
  border-radius:6px; padding:3px 9px; cursor:pointer; background:transparent; color:var(--sl-color-gray-2, #515a6e); }
.ta-lien.sup { color:#b91c1c; border-color:#f0caca; }
.ta-note { padding:8px 14px 12px; font-size:11px; color:var(--sl-color-gray-3, #94a3b8); }
`;

export default function TableProduitsAdmin() {
  const [rows, setRows] = useState(INITIAUX);

  const supprimer = (id) => setRows((r) => r.filter((x) => x.id !== id));
  const ajouter = () =>
    setRows((r) => [...r, { id: (r.length ? Math.max(...r.map((x) => x.id)) : 0) + 1, nom: 'Nouveau produit', prix: 0 }]);
  const reset = () => setRows(INITIAUX);

  return (
    <div className="ta-wrap">
      <style>{css}</style>
      <div className="ta-head">
        <div>
          <div className="ta-title">Aperçu : administration des produits</div>
          <div className="ta-sub">Lister, ajouter, modifier et supprimer (CRUD).</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ta-btn ta-add" onClick={ajouter}>+ Ajouter</button>
          <button className="ta-btn ta-reset" onClick={reset}>Réinitialiser</button>
        </div>
      </div>

      <table className="ta-table">
        <thead>
          <tr><th>id</th><th>Nom</th><th>Prix</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="ta-id">{p.id}</td>
              <td>{p.nom}</td>
              <td className="ta-prix">{prixQc(p.prix)}</td>
              <td>
                <span className="ta-act">
                  <button className="ta-lien">Modifier</button>
                  <button className="ta-lien sup" onClick={() => supprimer(p.id)}>Supprimer</button>
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} style={{ color: '#94a3b8' }}>Aucun produit. Cliquez sur « Réinitialiser ».</td></tr>
          )}
        </tbody>
      </table>

      <div className="ta-note">Démonstration : « Ajouter » et « Supprimer » ne modifient que cet aperçu. Dans le projet, ces actions passent par la base de données.</div>
    </div>
  );
}