import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Analyse d'une API tout-en-un
//
// Le fichier index.js de la note « Structurer une API Express », chaque ligne
// rattachée à la responsabilité qu'elle sert. Choisir une responsabilité isole
// ses lignes, affiche la raison pour laquelle cette partie du fichier devrait
// changer, et indique où elle ira dans la version structurée. Un filtre à part
// montre le code répété d'une route à l'autre.
// ─────────────────────────────────────────────────────────────────────────────

const RESPONSABILITES = {
  assemblage: { nom: 'Assemblage et démarrage', couleur: '#64748b', destination: 'app.js et serveur.js',
                raison: "le port change, ou un middleware commun à toutes les routes s'ajoute" },
  routage:    { nom: 'Routage',                 couleur: '#7c3aed', destination: 'routes/',
                raison: "une URL ou un verbe HTTP change" },
  requete:    { nom: 'Lecture de la requête',   couleur: '#2563eb', destination: 'controleurs/',
                raison: "le client envoie les données autrement, par exemple dans l'URL plutôt que dans le corps" },
  validation: { nom: 'Validation',              couleur: '#16a34a', destination: 'regles/ et intergiciels/',
                raison: "une exigence sur un champ s'ajoute ou se modifie" },
  domaine:    { nom: 'Règle du domaine',        couleur: '#0891b2', destination: 'services/',
                raison: "la règle métier évolue, par exemple un nom unique par utilisateur plutôt que pour toute l'application" },
  donnees:    { nom: 'Accès aux données',       couleur: '#b45309', destination: 'modeles/',
                raison: "on remplace le tableau en mémoire par une base de données" },
  reponse:    { nom: 'Réponse HTTP',            couleur: '#db2777', destination: 'controleurs/',
                raison: "le format des réponses ou les codes de statut changent" },
};

const REPETE = { nom: 'Code répété', couleur: '#dc2626' };

// [texte, responsabilité, répété] ; responsabilité null pour une ligne neutre
const LIGNES = [
  ['import express from "express";', 'assemblage'],
  ['', null],
  ['const app = express();', 'assemblage'],
  ['app.use(express.json());', 'assemblage'],
  ['', null],
  ['const boites = [];', 'donnees'],
  ['let prochainId = 1;', 'donnees'],
  ['', null],
  ['app.get("/boites", (req, res) => {', 'routage'],
  ['  res.json(boites);', 'reponse'],
  ['});', null],
  ['', null],
  ['app.post("/boites", (req, res) => {', 'routage'],
  ['  const { nom, capacite } = req.body ?? {};', 'requete'],
  ['  if (typeof nom !== "string" || nom.trim() === "") {', 'validation'],
  ['    return res.status(400).json({ erreur: "nom requis" });', 'reponse'],
  ['  }', null],
  ['  if (!Number.isInteger(capacite) || capacite <= 0) {', 'validation'],
  ['    return res.status(400).json({ erreur: "entier positif attendu" });', 'reponse'],
  ['  }', null],
  ['  if (boites.some((b) => b.nom === nom)) {', 'domaine'],
  ['    return res.status(409).json({ erreur: "nom déjà utilisé" });', 'reponse'],
  ['  }', null],
  ['  const boite = { id: prochainId++, nom, capacite };', 'donnees'],
  ['  boites.push(boite);', 'donnees'],
  ['  res.status(201).json(boite);', 'reponse'],
  ['});', null],
  ['', null],
  ['app.get("/boites/:id", (req, res) => {', 'routage'],
  ['  const boite = boites.find((b) => b.id === Number(req.params.id));', 'donnees', true],
  ['  if (!boite) return res.status(404).json({ erreur: "boite introuvable" });', 'reponse', true],
  ['  res.json(boite);', 'reponse'],
  ['});', null],
  ['', null],
  ['app.delete("/boites/:id", (req, res) => {', 'routage'],
  ['  const index = boites.findIndex((b) => b.id === Number(req.params.id));', 'donnees', true],
  ['  if (index === -1) return res.status(404).json({ erreur: "boite introuvable" });', 'reponse', true],
  ['  boites.splice(index, 1);', 'donnees'],
  ['  res.status(204).end();', 'reponse'],
  ['});', null],
  ['', null],
  ['app.listen(3000);', 'assemblage'],
];

const COMPTES = LIGNES.reduce((acc, [, r]) => {
  if (r) acc[r] = (acc[r] || 0) + 1;
  return acc;
}, {});
const TOTAL = LIGNES.filter(([, r]) => r).length;
const DISTINCTES = Object.keys(COMPTES).length;
const NB_REPETEES = LIGNES.filter(([, , rep]) => rep).length;

const css = `
.art { border:1px solid var(--sl-color-gray-5, #e6e9ef); border-radius:12px; overflow:hidden;
  background:var(--sl-color-bg, #fff); margin:1.5rem 0; }
.art-head { margin-top:0; padding:10px 14px; border-bottom:1px solid var(--sl-color-gray-5, #e6e9ef);
  background:var(--sl-color-gray-6, #f7f8fa); display:flex; align-items:center;
  justify-content:space-between; gap:10px; flex-wrap:wrap; }
.art-title { font-size:14px; font-weight:700; letter-spacing:.03em; color:var(--sl-color-accent, #4f46e5); }
.art-sub { font-size:13px; color:var(--sl-color-gray-3, #6b7280); margin-top:2px; }
.art-compte { font-size:13px; font-weight:700; color:var(--sl-color-text, #2b3245);
  border:1px solid var(--sl-color-gray-5, #d7dce6); border-radius:999px; padding:3px 11px; white-space:nowrap; }
.art-puces { display:flex; flex-wrap:wrap; gap:6px; padding:12px 14px 4px; }
.art-puce { margin:0; display:inline-flex; align-items:center; gap:6px; font:inherit; font-size:12px;
  font-weight:600; padding:4px 10px; border-radius:999px; cursor:pointer; background:transparent;
  border:1px solid var(--sl-color-gray-5, #d7dce6); color:var(--sl-color-gray-2, #515a6e);
  transition:background .15s, border-color .15s, color .15s; }
.art-puce:hover { background:var(--sl-color-gray-6, #f4f5f8); }
.art-puce-repete { border-style:dashed; }
.art-pastille { width:9px; height:9px; border-radius:3px; flex:0 0 auto; }
.art-n { font-family:var(--sl-font-mono, monospace); font-size:11px; opacity:.7; }
.art-raison { margin:8px 14px 0; padding:9px 12px; border-left:3px solid; border-radius:0 8px 8px 0;
  font-size:13px; line-height:1.55; color:var(--sl-color-text, #2b3245); }
.art-raison-t { font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase;
  display:block; margin-bottom:2px; }
.art-dest { display:block; margin-top:6px; font-size:12px; color:var(--sl-color-gray-2, #515a6e); }
.art-dest code { font-family:var(--sl-font-mono, monospace); font-size:12px; }
.art-invite { margin:8px 14px 0; font-size:13px; color:var(--sl-color-gray-3, #94a3b8); }
.art-pre { margin:12px 0 0; padding:10px 0; font-family:var(--sl-font-mono, 'Fira Code', monospace);
  font-size:13px; line-height:1.6; color:var(--sl-color-text, #2b3245); overflow-x:auto;
  border-top:1px solid var(--sl-color-gray-5, #e6e9ef); }
.art-l { display:block; padding:0 12px 0 11px; white-space:pre; border-left:3px solid transparent;
  transition:opacity .15s, background .15s; }
.art-cap { padding:10px 14px; border-top:1px solid var(--sl-color-gray-5, #e6e9ef);
  font-size:14px; line-height:1.5; color:var(--sl-color-text, #2b3245); }
@media (prefers-reduced-motion: reduce) {
  .art-puce, .art-l { transition:none; }
}
`;

export default function AnalyseRoute() {
  const [actif, setActif] = useState(null);           // clé de responsabilité, 'repete', ou null
  const repete = actif === 'repete';
  const r = actif && !repete ? RESPONSABILITES[actif] : null;

  function estVive([, resp, rep]) {
    if (!actif) return true;
    return repete ? Boolean(rep) : resp === actif;
  }

  return (
    <div className="art">
      <style>{css}</style>

      <div className="art-head">
        <div>
          <div className="art-title">index.js, ligne par ligne</div>
          <div className="art-sub">Choisissez une responsabilité pour isoler ses lignes.</div>
        </div>
        <span className="art-compte">{DISTINCTES} responsabilités, {TOTAL} lignes</span>
      </div>

      <div className="art-puces" role="group" aria-label="Responsabilités">
        {Object.entries(RESPONSABILITES).map(([cle, x]) => {
          const on = actif === cle;
          return (
            <button key={cle} type="button" className="art-puce" aria-pressed={on}
                    onClick={() => setActif(on ? null : cle)}
                    style={on ? { background: x.couleur + '14', borderColor: x.couleur, color: x.couleur } : undefined}>
              <span className="art-pastille" style={{ background: x.couleur }} />
              {x.nom}
              <span className="art-n">{COMPTES[cle] || 0}</span>
            </button>
          );
        })}
        <button type="button" className="art-puce art-puce-repete" aria-pressed={repete}
                onClick={() => setActif(repete ? null : 'repete')}
                style={repete ? { background: REPETE.couleur + '14', borderColor: REPETE.couleur, color: REPETE.couleur } : undefined}>
          <span className="art-pastille" style={{ background: REPETE.couleur }} />
          {REPETE.nom}
          <span className="art-n">{NB_REPETEES}</span>
        </button>
      </div>

      {r && (
        <div className="art-raison" style={{ borderLeftColor: r.couleur, background: r.couleur + '0d' }}>
          <span className="art-raison-t" style={{ color: r.couleur }}>Cette partie change si</span>
          {r.raison}.
          <span className="art-dest">Dans la version structurée : <code>{r.destination}</code></span>
        </div>
      )}
      {repete && (
        <div className="art-raison" style={{ borderLeftColor: REPETE.couleur, background: REPETE.couleur + '0d' }}>
          <span className="art-raison-t" style={{ color: REPETE.couleur }}>Écrit deux fois</span>
          Chercher une boite par son identifiant, puis répondre 404 si elle n'existe pas : la même
          intention, écrite deux fois, de deux façons différentes. Une correction faite à un seul
          endroit, et les deux routes ne se comportent plus pareil.
          <span className="art-dest">Dans la version structurée : un seul middleware, <code>chargerBoite</code></span>
        </div>
      )}
      {!actif && (
        <div className="art-invite">
          Chaque couleur correspond à une raison différente de modifier ce fichier.
        </div>
      )}

      <pre className="art-pre">
        {LIGNES.map((ligne, i) => {
          const [texte, resp, rep] = ligne;
          const c = repete ? (rep ? REPETE.couleur : null) : (resp ? RESPONSABILITES[resp].couleur : null);
          const vive = estVive(ligne);
          const surlignee = actif && vive && c;
          return (
            <span key={i} className="art-l"
                  style={{
                    borderLeftColor: c || 'transparent',
                    background: surlignee ? c + '14' : 'transparent',
                    opacity: vive ? 1 : 0.28,
                  }}>
              {texte || ' '}
            </span>
          );
        })}
      </pre>

      <div className="art-cap">
        Ce fichier fonctionne. Mais il a {DISTINCTES} raisons différentes de changer, toutes mêlées
        dans les mêmes routes, et une partie de son code est répétée d'une route à l'autre. Modifier
        l'une de ces responsabilités oblige à relire toutes les autres pour ne rien casser.
      </div>
    </div>
  );
}