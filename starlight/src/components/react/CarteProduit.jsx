// Aperçu d'interface : cartes de produit de la boutique.
// Composant illustratif (présentation seulement) pour montrer à quoi
// pourrait ressembler chaque carte : image, nom, prix, bouton d'ajout.

const produits = [
  { nom: "Sirop d'érable 540 ml", prix: 14.5, teinte: '#b45309' },
  { nom: "Beurre d'érable 250 g", prix: 9.95, teinte: '#d97706' },
  { nom: 'Tire sur la neige', prix: 6, teinte: '#92400e' },
];

const prixQc = (p) => p.toFixed(2).replace('.', ',') + ' $';

const css = `
.cp-wrap { margin: 0; border:1px solid var(--sl-color-gray-5, #e6e9ef); border-radius:12px; overflow:hidden;
  background:var(--sl-color-bg, #fff); margin:1.5rem 0; }
.cp-head { margin: 0; padding:10px 14px; border-bottom:1px solid var(--sl-color-gray-5, #e6e9ef);
  background:var(--sl-color-gray-6, #f7f8fa); }
.cp-title { font-size:14px; font-weight:700; letter-spacing:.03em; color:var(--sl-color-accent, #4f46e5); }
.cp-sub { font-size:12px; color:var(--sl-color-gray-3, #6b7280); margin-top:2px; }
.cp-row { display:flex; flex-wrap:wrap; gap:14px; padding:16px; }
.cp-card { flex:1 1 160px; margin-top: 0; max-width:210px; border:1px solid var(--sl-color-gray-5, #e6e9ef);
  border-radius:10px; overflow:hidden; background:var(--sl-color-bg, #fff); }
.cp-img { height:90px; display:flex; align-items:center; justify-content:center; }
.cp-body { padding:10px 12px; }
.cp-nom { font:600 14px 'Plus Jakarta Sans', system-ui, sans-serif; color:var(--sl-color-text, #1c2230); }
.cp-prix { font:700 14px 'Fira Code', monospace; color:var(--sl-color-accent, #4f46e5); margin:4px 0 10px; }
.cp-btn { display:block; width:100%; text-align:center; background:var(--sl-color-accent, #4f46e5);
  color:#fff; border:0; border-radius:8px; padding:7px 0; font:600 13px 'Plus Jakarta Sans', system-ui, sans-serif; cursor:pointer; }
`;

export default function CarteProduit() {
  return (
    <div className="cp-wrap">
      <style>{css}</style>
      <div className="cp-head">
        <div className="cp-title">Aperçu : carte de produit</div>
        <div className="cp-sub">Chaque carte présente une image, le nom, le prix et un bouton d'ajout.</div>
      </div>
      <div className="cp-row">
        {produits.map((p) => (
          <div className="cp-card" key={p.nom}>
            <div className="cp-img" style={{ background: p.teinte }}>
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none"
                   stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8.5" cy="9" r="1.6" />
                <path d="M4 18l5-5 4 4 3-3 4 4" />
              </svg>
            </div>
            <div className="cp-body">
              <div className="cp-nom">{p.nom}</div>
              <div className="cp-prix">{prixQc(p.prix)}</div>
              <button className="cp-btn">Ajouter au panier</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}