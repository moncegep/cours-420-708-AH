import { useState, useRef, useEffect } from "react";
import {
  Laptop, Server, Database, Play, RotateCcw, Settings, X,
  ArrowRight, CheckCircle2, XCircle, Copy, Check, Lock,
} from "lucide-react";

/**
 * ExchangeSimulator (v3)
 *
 * Simulation animee et configurable d'un echange REST contre un jeu
 * de donnees seed *mutable* : les POST/DELETE modifient reellement
 * l'etat en memoire, donc un GET ulterieur reflete le changement.
 *
 * - En-tetes HTTP visibles et editables (Content-Type, Accept, x-api-key)
 * - Authentification simulee : 401 si cle absente, 403 si invalide
 * - Effets de bord montres : le SEED change, un badge signale les mutations
 * - CRUD complet : GET, POST, DELETE
 * - Bouton "copier cURL" pour passer a Postman/Bruno
 *
 * Usage (Astro island) :
 *   import ExchangeSimulator from "../components/ExchangeSimulator.jsx";
 *   <ExchangeSimulator client:visible />
 *
 * Dependance : npm i lucide-react
 */

/* Cle API valide pour la simulation (un device enregistre) */
const VALID_KEY = "sk-demo-7a3f";

const clone = (o) => JSON.parse(JSON.stringify(o));

/* ============================================================
   SCENARIOS
   Chaque scenario = { titre, seed, endpoints }. On le choisit via
   la prop `scenario`. Les fonctions resolve() vivent ici (cote
   composant) car les iles Astro ne peuvent pas serialiser des
   fonctions passees en props depuis MDX.

   - "lino"  : exemple complet boites a livres (CRUD + auth + mutation)
   - "express-hello"  : serveur Express minimal, GET / -> texte
   - "express-json"   : GET /boites -> tableau JSON
   - "express-param"  : GET /boites/:id -> param + 404
   - "express-post"   : POST /boites -> lecture du corps + creation
   ============================================================ */

/* Jeu de donnees seed initial du scenario Lino (clone a chaque reset) */
const INITIAL_SEED = {
  boites: [
    { _id: "boite-14", nom: "Boite du parc Laurier", statut: "active", livres_estimes: 12, derniere_activite: "il y a 2 heures" },
    { _id: "boite-7", nom: "Coin Fabre / Saint-Zotique", statut: "active", livres_estimes: 5, derniere_activite: "il y a 3 jours" },
    { _id: "boite-3", nom: "Place Saint-Hubert", statut: "inactive", livres_estimes: 0, derniere_activite: "il y a 2 semaines" },
  ],
  evenements: [
    { code_qr: "QR-7890", titre: "Dune", action: "depose", boite: "boite-7", date: "2026-04-01" },
    { code_qr: "QR-7890", titre: "Dune", action: "pris", boite: "boite-7", date: "2026-04-18" },
    { code_qr: "QR-7890", titre: "Dune", action: "depose", boite: "boite-14", date: "2026-05-12" },
    { code_qr: "QR-3456", titre: "Le Petit Prince", action: "depose", boite: "boite-14", date: "2026-05-10" },
  ],
  recherches: [
    { _id: "rech-5", titre: "Dune", statut: "en attente" },
  ],
};

/* Definition des endpoints Lino. resolve(db, params, body) peut MUTER db. */

const ENDPOINTS = [
  {
    id: "list-boites",
    method: "GET",
    template: "/boites",
    label: "Lister les boites a proximite",
    auth: false,
    params: [
      { name: "lat", in: "query", def: "45.523" },
      { name: "lon", in: "query", def: "-73.587" },
      { name: "rayon", in: "query", def: "2km" },
    ],
    body: null,
    steps: ["Lire lat, lon, rayon", "Interroger l'index 2dsphere", "Calculer les distances et trier"],
    dbStep: 1,
    resolve: (db) => ({
      status: 200,
      response: db.boites
        .filter((b) => b.statut === "active")
        .map((b) => ({ id: b._id, nom: b.nom, distance: b._id === "boite-14" ? "450m" : "1.1km", livres_estimes: b.livres_estimes })),
    }),
  },
  {
    id: "detail-boite",
    method: "GET",
    template: "/boites/:id",
    label: "Detail d'une boite",
    auth: false,
    params: [{ name: "id", in: "path", def: "boite-14" }],
    body: null,
    steps: ["Chercher le document par _id", "Compter les livres via les evenements"],
    dbStep: 0,
    resolve: (db, p) => {
      const b = db.boites.find((x) => x._id === p.id);
      if (!b) return { status: 404, response: { error: "BOITE_NOT_FOUND", message: "La boite '" + p.id + "' n'existe pas.", available: "/boites" } };
      const livres = db.evenements.filter((e) => e.boite === b._id && e.action === "depose").length;
      return { status: 200, response: { id: b._id, nom: b.nom, statut: b.statut, livres_estimes: livres, _links: { livres: "/boites/" + b._id + "/livres" } } };
    },
  },
  {
    id: "list-livres",
    method: "GET",
    template: "/boites/:id/livres",
    label: "Livres dans une boite",
    auth: false,
    params: [{ name: "id", in: "path", def: "boite-14" }],
    body: null,
    steps: ["Verifier que la boite existe", "Trouver les depots sans retrait correspondant"],
    dbStep: 1,
    resolve: (db, p) => {
      const b = db.boites.find((x) => x._id === p.id);
      if (!b) return { status: 404, response: { error: "BOITE_NOT_FOUND", message: "La boite '" + p.id + "' n'existe pas." } };
      const evts = db.evenements.filter((e) => e.boite === p.id);
      const present = {};
      evts.forEach((e) => { present[e.code_qr] = e.action === "depose"; });
      const livres = Object.entries(present).filter(([, v]) => v).map(([qr]) => {
        const e = evts.find((x) => x.code_qr === qr);
        return { code_qr: qr, titre: e.titre };
      });
      return { status: 200, response: livres };
    },
  },
  {
    id: "depot-livre",
    method: "POST",
    template: "/boites/:id/livres",
    label: "Deposer un livre",
    auth: true,
    params: [{ name: "id", in: "path", def: "boite-14" }],
    body: { titre: "L'Etranger", auteur: "Albert Camus", code_qr: "QR-2222" },
    steps: ["Authentifier la cle API", "Valider le corps", "Verifier que la boite existe", "Inserer l'evenement de depot", "Verifier les recherches actives"],
    dbStep: 3,
    resolve: (db, p, parsed) => {
      const b = db.boites.find((x) => x._id === p.id);
      if (!b) return { status: 404, response: { error: "BOITE_NOT_FOUND", message: "La boite '" + p.id + "' n'existe pas." } };
      if (!parsed.titre || !parsed.code_qr) {
        return { status: 400, response: { error: "MISSING_FIELDS", message: "Les champs 'titre' et 'code_qr' sont requis.", received: Object.keys(parsed) } };
      }
      // MUTATION : inserer l'evenement + mettre a jour la boite
      db.evenements.push({ code_qr: parsed.code_qr, titre: parsed.titre, action: "depose", boite: p.id, date: "2026-05-13" });
      b.derniere_activite = "a l'instant";
      const notif = db.recherches.filter((r) => r.statut === "en attente" && r.titre.toLowerCase() === parsed.titre.toLowerCase());
      notif.forEach((r) => { r.statut = "trouve"; });
      return {
        status: 201,
        mutated: true,
        response: { message: "Livre depose.", recherches_notifiees: notif.length, _links: { livre: "/livres/" + parsed.code_qr } },
      };
    },
  },
  {
    id: "prendre-livre",
    method: "DELETE",
    template: "/boites/:id/livres/:code_qr",
    label: "Prendre un livre",
    auth: true,
    params: [
      { name: "id", in: "path", def: "boite-14" },
      { name: "code_qr", in: "path", def: "QR-3456" },
    ],
    body: null,
    steps: ["Authentifier la cle API", "Verifier que le livre est dans la boite", "Inserer l'evenement de retrait"],
    dbStep: 2,
    resolve: (db, p) => {
      const present = db.evenements.filter((e) => e.boite === p.id && e.code_qr === p.code_qr);
      const last = present[present.length - 1];
      if (!last || last.action !== "depose") {
        return { status: 404, response: { error: "LIVRE_ABSENT", message: "Le livre '" + p.code_qr + "' n'est pas dans la boite '" + p.id + "'." } };
      }
      // MUTATION : inserer un retrait
      db.evenements.push({ code_qr: p.code_qr, titre: last.titre, action: "pris", boite: p.id, date: "2026-05-13" });
      return { status: 204, mutated: true, response: null };
    },
  },
  {
    id: "parcours-livre",
    method: "GET",
    template: "/livres/:code_qr",
    label: "Parcours d'un livre",
    auth: false,
    params: [{ name: "code_qr", in: "path", def: "QR-7890" }],
    body: null,
    steps: ["Chercher les evenements du code_qr", "Trier par date", "Agreger en parcours"],
    dbStep: 0,
    resolve: (db, p) => {
      const evts = db.evenements.filter((e) => e.code_qr === p.code_qr);
      if (evts.length === 0) return { status: 404, response: { error: "LIVRE_NOT_FOUND", message: "Aucun livre avec le code '" + p.code_qr + "'." } };
      return {
        status: 200,
        response: {
          code_qr: p.code_qr,
          titre: evts[0].titre,
          parcours: evts.map((e) => ({ action: e.action, boite: e.boite, date: e.date })),
          position_actuelle: evts[evts.length - 1].action === "depose" ? evts[evts.length - 1].boite : "en circulation",
        },
      };
    },
  },
];

/* ── Scenarios Express (progression de la prise en main) ──── */

// Seed minimal partage par les scenarios Express qui touchent aux donnees
const EXPRESS_SEED = {
  boites: [
    { id: 14, nom: "Boite du parc Laurier", quartier: "Plateau" },
    { id: 7, nom: "Coin Fabre / Saint-Zotique", quartier: "Rosemont" },
    { id: 3, nom: "Place Saint-Hubert", quartier: "Plateau" },
  ],
};

const EXPRESS_HELLO = [
  {
    id: "hello",
    method: "GET",
    template: "/",
    label: "Page d'accueil",
    auth: false,
    params: [],
    body: null,
    steps: ["Express recoit la requete", "La route GET / correspond", "res.send() renvoie le texte"],
    dbStep: -1,
    resolve: () => ({ status: 200, response: "Bonjour depuis Express!", raw: true }),
  },
];

const EXPRESS_JSON = [
  {
    id: "list",
    method: "GET",
    template: "/boites",
    label: "Lister les boites",
    auth: false,
    params: [],
    body: null,
    steps: ["La route GET /boites correspond", "Lire le tableau des boites", "res.json() serialise et renvoie"],
    dbStep: 1,
    resolve: (db) => ({ status: 200, response: db.boites }),
  },
];

const EXPRESS_PARAM = [
  {
    id: "detail",
    method: "GET",
    template: "/boites/:id",
    label: "Detail d'une boite",
    auth: false,
    params: [{ name: "id", in: "path", def: "14" }],
    body: null,
    steps: ["Extraire req.params.id", "Chercher la boite correspondante", "Renvoyer la boite ou un 404"],
    dbStep: 1,
    resolve: (db, p) => {
      const b = db.boites.find((x) => String(x.id) === String(p.id));
      if (!b) return { status: 404, response: { error: "Boite introuvable", id: p.id } };
      return { status: 200, response: b };
    },
  },
];

const EXPRESS_QUERY = [
  {
    id: "filter",
    method: "GET",
    template: "/boites",
    label: "Filtrer par quartier",
    auth: false,
    params: [{ name: "quartier", in: "query", def: "Plateau" }],
    body: null,
    steps: ["Lire req.query.quartier", "Si absent, tout renvoyer", "Sinon filtrer le tableau", "res.json() renvoie le sous-ensemble"],
    dbStep: 2,
    resolve: (db, p) => {
      const q = p.quartier;
      if (!q) return { status: 200, response: db.boites };
      const filtrees = db.boites.filter((b) => b.quartier.toLowerCase() === q.toLowerCase());
      return { status: 200, response: filtrees };
    },
  },
];

const EXPRESS_POST = [
  {
    id: "list",
    method: "GET",
    template: "/boites",
    label: "Lister les boites",
    auth: false,
    params: [],
    body: null,
    steps: ["La route GET /boites correspond", "Lire le tableau des boites", "res.json() renvoie"],
    dbStep: 1,
    resolve: (db) => ({ status: 200, response: db.boites }),
  },
  {
    id: "create",
    method: "POST",
    template: "/boites",
    label: "Ajouter une boite",
    auth: false,
    params: [],
    body: { nom: "Boite du marche Jean-Talon", quartier: "Villeray" },
    steps: ["express.json() parse le corps", "Lire req.body", "Valider les champs", "Ajouter au tableau", "Renvoyer 201 avec la boite creee"],
    dbStep: 3,
    resolve: (db, p, parsed) => {
      if (!parsed || !parsed.nom) {
        return { status: 400, response: { error: "Le champ 'nom' est requis." } };
      }
      const nouvelle = { id: db.boites.length + 1, nom: parsed.nom, quartier: parsed.quartier || "inconnu" };
      db.boites.push(nouvelle);
      return { status: 201, mutated: true, response: nouvelle };
    },
  },
  {
    id: "update",
    method: "PUT",
    template: "/boites/:id",
    label: "Remplacer une boite",
    auth: false,
    params: [{ name: "id", in: "path", def: "14" }],
    body: { nom: "Boite du parc Laurier (renovee)", quartier: "Plateau" },
    steps: ["Extraire req.params.id", "Lire req.body", "Verifier que la boite existe", "Remplacer ses champs", "Renvoyer la boite modifiee"],
    dbStep: 2,
    resolve: (db, p, parsed) => {
      const b = db.boites.find((x) => String(x.id) === String(p.id));
      if (!b) return { status: 404, response: { error: "Boite introuvable", id: p.id } };
      if (!parsed || !parsed.nom) {
        return { status: 400, response: { error: "Le champ 'nom' est requis." } };
      }
      b.nom = parsed.nom;
      b.quartier = parsed.quartier || "inconnu";
      return { status: 200, mutated: true, response: b };
    },
  },
  {
    id: "remove",
    method: "DELETE",
    template: "/boites/:id",
    label: "Supprimer une boite",
    auth: false,
    params: [{ name: "id", in: "path", def: "7" }],
    body: null,
    steps: ["Extraire req.params.id", "Trouver l'index dans le tableau", "Retirer l'element", "Renvoyer 204 sans corps"],
    dbStep: 1,
    resolve: (db, p) => {
      const i = db.boites.findIndex((x) => String(x.id) === String(p.id));
      if (i === -1) return { status: 404, response: { error: "Boite introuvable", id: p.id } };
      db.boites.splice(i, 1);
      return { status: 204, mutated: true, response: null };
    },
  },
];

const SCENARIOS = {
  lino: { titre: "Simulateur d'echange REST", seed: INITIAL_SEED, endpoints: ENDPOINTS },
  "express-hello": { titre: "GET / — serveur minimal", seed: {}, endpoints: EXPRESS_HELLO },
  "express-json": { titre: "GET /boites — repondre en JSON", seed: EXPRESS_SEED, endpoints: EXPRESS_JSON },
  "express-param": { titre: "GET /boites/:id — parametre de route", seed: EXPRESS_SEED, endpoints: EXPRESS_PARAM },
  "express-query": { titre: "GET /boites?quartier=… — filtrer", seed: EXPRESS_SEED, endpoints: EXPRESS_QUERY },
  "express-post": { titre: "POST /boites — lire le corps", seed: EXPRESS_SEED, endpoints: EXPRESS_POST },
};

const METHOD = {
  GET: { bg: "#dcfce7", fg: "#166534", wire: "#22c55e" },
  POST: { bg: "#dbeafe", fg: "#1e40af", wire: "#3b82f6" },
  PUT: { bg: "#fef3c7", fg: "#92400e", wire: "#d97706" },
  DELETE: { bg: "#fee2e2", fg: "#991b1b", wire: "#ef4444" },
};
const statusColor = (s) =>
  s >= 500 ? { bg: "#fef3c7", fg: "#92400e", wire: "#d97706" }
  : s >= 400 ? { bg: "#fee2e2", fg: "#991b1b", wire: "#ef4444" }
  : { bg: "#dcfce7", fg: "#166534", wire: "#22c55e" };

export default function ExchangeSimulator({ scenario = "lino", compact = false }) {
  const SC = SCENARIOS[scenario] || SCENARIOS.lino;
  const SC_SEED = SC.seed;
  const SC_ENDPOINTS = SC.endpoints;
  const hasAuth = SC_ENDPOINTS.some((e) => e.auth);
  const hasSeed = Object.keys(SC_SEED).length > 0;
  const showExtras = !compact;

  const [db, setDb] = useState(() => clone(SC_SEED));
  const [sel, setSel] = useState(SC_ENDPOINTS[0]);
  const [phase, setPhase] = useState("idle");
  const [activeStep, setActiveStep] = useState(-1);
  const [params, setParams] = useState(() => initParams(SC_ENDPOINTS[0]));
  const [bodyText, setBodyText] = useState(SC_ENDPOINTS[0].body ? JSON.stringify(SC_ENDPOINTS[0].body, null, 2) : "");
  const [apiKey, setApiKey] = useState(VALID_KEY);
  const [accept, setAccept] = useState("application/json");
  const [result, setResult] = useState(null);
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mutatedColls, setMutatedColls] = useState([]);
  const timers = useRef([]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clear(), []);

  function initParams(ep) {
    const o = {};
    ep.params.forEach((p) => (o[p.name] = p.def));
    return o;
  }

  function pick(ep) {
    clear();
    setSel(ep);
    setParams(initParams(ep));
    setBodyText(ep.body ? JSON.stringify(ep.body, null, 2) : "");
    setPhase("idle");
    setActiveStep(-1);
    setResult(null);
    setMutatedColls([]);
  }

  function buildPath(ep, p) {
    let path = ep.template;
    const query = [];
    ep.params.forEach((param) => {
      if (param.in === "path") path = path.replace(":" + param.name, p[param.name] || ":" + param.name);
      else query.push(param.name + "=" + encodeURIComponent(p[param.name] || ""));
    });
    return path + (query.length ? "?" + query.join("&") : "");
  }

  function compute() {
    // Authentification d'abord
    if (sel.auth) {
      if (!apiKey) return { status: 401, response: { error: "UNAUTHORIZED", message: "En-tete x-api-key manquant." } };
      if (apiKey !== VALID_KEY) return { status: 403, response: { error: "FORBIDDEN", message: "Cle API invalide." } };
    }
    // Corps JSON
    let parsed = null;
    if (sel.body !== null) {
      try { parsed = JSON.parse(bodyText); }
      catch { return { status: 400, response: { error: "INVALID_JSON", message: "Le corps n'est pas du JSON valide." } }; }
    }
    // resolve peut muter une copie de db
    const next = clone(db);
    const res = sel.resolve(next, params, parsed);
    if (res.mutated) {
      setDb(next);
      setMutatedColls(["evenements", "boites", "recherches"].filter((c) =>
        JSON.stringify(next[c]) !== JSON.stringify(db[c])
      ));
    } else {
      setMutatedColls([]);
    }
    return res;
  }

  function run() {
    clear();
    const res = compute();
    setResult(res);
    setPhase("request");
    setActiveStep(-1);
    const t = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    t(() => setPhase("process"), 950);
    sel.steps.forEach((_, i) => t(() => setActiveStep(i), 1200 + i * 480));
    const end = 1200 + sel.steps.length * 480 + 200;
    t(() => { setPhase("response"); setActiveStep(-1); }, end);
    t(() => setPhase("done"), end + 950);
  }

  function reset() { clear(); setPhase("idle"); setActiveStep(-1); setResult(null); setMutatedColls([]); }
  function resetDb() { setDb(clone(SC_SEED)); setMutatedColls([]); reset(); }

  function copyCurl() {
    const lines = ["curl -X " + sel.method + " 'https://api.lino.app" + fullPath + "'"];
    lines.push("  -H 'Accept: " + accept + "'");
    if (sel.body !== null) lines.push("  -H 'Content-Type: application/json'");
    if (sel.auth) lines.push("  -H 'x-api-key: " + apiKey + "'");
    if (sel.body !== null) lines.push("  -d '" + bodyText.replace(/\n\s*/g, " ") + "'");
    const curl = lines.join(" \\\n");
    navigator.clipboard?.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const mc = METHOD[sel.method];
  const sc = result ? statusColor(result.status) : mc;
  const isResp = phase === "response" || phase === "done";
  const wireColor = isResp ? sc.wire : mc.wire;
  const fullPath = buildPath(sel, params);

  let bodyValid = true;
  if (sel.body !== null && bodyText.trim()) {
    try { JSON.parse(bodyText); } catch { bodyValid = false; }
  }

  return (
    <div className="xs">
      <style>{CSS}</style>

      <div className="xs-top">
        <span className="xs-top__title">{SC.titre}</span>
        {hasSeed && (
          <button className="xs-icon-btn" onClick={() => setShowSeed((v) => !v)} aria-label="Donnees de simulation">
            <Settings size={16} />
            <span>Donnees</span>
          </button>
        )}
      </div>

      {hasSeed && showSeed && (
        <div className="xs-seed">
          <div className="xs-seed__head">
            <span>Etat actuel de la base</span>
            <div className="xs-seed__head-actions">
              <button className="xs-icon-btn xs-icon-btn--ghost" onClick={resetDb} aria-label="Reinitialiser la base">
                <RotateCcw size={14} /> <span>Reinitialiser</span>
              </button>
              <button className="xs-icon-btn xs-icon-btn--ghost" onClick={() => setShowSeed(false)} aria-label="Fermer">
                <X size={15} />
              </button>
            </div>
          </div>
          <p className="xs-seed__note">Les requetes qui modifient l'etat (POST, DELETE) changent reellement ces donnees. Relancez une lecture apres : la base a change.</p>
          {Object.entries(db).map(([coll, docs]) => (
            <div key={coll} className="xs-seed__coll">
              <div className="xs-seed__coll-name">
                {coll} <span>({docs.length})</span>
                {mutatedColls.includes(coll) && <span className="xs-seed__changed">modifie</span>}
              </div>
              <pre className="xs-seed__json">{JSON.stringify(docs, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}

      {SC_ENDPOINTS.length > 1 && (
        <div className="xs-picker">
          {SC_ENDPOINTS.map((ep) => {
            const c = METHOD[ep.method];
            const on = ep.id === sel.id;
            return (
              <button key={ep.id} className={"xs-chip " + (on ? "on" : "")} onClick={() => pick(ep)}>
                <span className="xs-chip__m" style={{ background: c.bg, color: c.fg }}>{ep.method}</span>
                <span>{ep.label}</span>
                {ep.auth && <Lock size={12} className="xs-chip__lock" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="xs-stage">
        <div className={"xs-node " + ((phase !== "idle" && !isResp) || phase === "done" ? "lit" : "")}>
          <Laptop size={26} strokeWidth={1.6} />
          <span className="xs-node__n">Client</span>
        </div>

        <div className="xs-wire">
          <div className="xs-wire__track" />
          <div
            className={"xs-wire__flow " + (phase === "request" ? "fwd" : "") + " " + (phase === "response" ? "bwd" : "")}
            style={{ "--wc": wireColor }}
          />
          <div
            className={"xs-pkt " + ((phase === "request" || phase === "response") ? "show" : "") + " " + (isResp ? "at-client" : phase === "request" ? "at-server" : "")}
            style={{ background: isResp ? sc.bg : mc.bg, color: isResp ? sc.fg : mc.fg }}
          >
            {isResp ? (result && result.status) : sel.method}
            {phase === "request" && <ArrowRight size={12} style={{ marginLeft: 3 }} />}
          </div>
        </div>

        <div className="xs-srv">
          <div className={"xs-node " + (phase === "process" ? "beat" : "")}>
            <Server size={26} strokeWidth={1.6} />
            <span className="xs-node__n">Serveur</span>
          </div>
          {hasSeed && (
            <div className={"xs-db " + (phase === "process" && activeStep === sel.dbStep ? "query" : "")}>
              <Database size={22} strokeWidth={1.6} />
            </div>
          )}
        </div>
      </div>

      <div className="xs-card">
        <div className="xs-card__h">
          <span className="xs-tag xs-tag--req">Requete</span>
          <span className="xs-method" style={{ background: mc.bg, color: mc.fg }}>{sel.method}</span>
          <code className="xs-path">{fullPath}</code>
          <button className="xs-copy" onClick={copyCurl} aria-label="Copier en cURL">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copie" : "cURL"}
          </button>
        </div>

        {sel.params.length > 0 && (
          <div className="xs-params">
            {sel.params.map((p) => (
              <label key={p.name} className="xs-param">
                <span className="xs-param__k">
                  {p.name}
                  <span className={"xs-param__in xs-param__in--" + p.in}>{p.in}</span>
                </span>
                <input
                  className="xs-param__v"
                  value={params[p.name]}
                  onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                  spellCheck={false}
                />
              </label>
            ))}
          </div>
        )}

        {/* En-tetes */}
        {showExtras && (
        <div className="xs-headers">
          <div className="xs-headers__label">En-tetes</div>
          <div className="xs-header">
            <code className="xs-header__k">Accept</code>
            <input className="xs-header__v" value={accept} onChange={(e) => setAccept(e.target.value)} spellCheck={false} />
          </div>
          {sel.body !== null && (
            <div className="xs-header">
              <code className="xs-header__k">Content-Type</code>
              <span className="xs-header__static">application/json</span>
            </div>
          )}
          {sel.auth && (
            <div className="xs-header">
              <code className="xs-header__k">
                <Lock size={11} style={{ marginRight: 3, verticalAlign: -1 }} />
                x-api-key
              </code>
              <input
                className={"xs-header__v " + (apiKey === VALID_KEY ? "ok" : apiKey ? "bad" : "")}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                spellCheck={false}
                placeholder="(vide -> 401)"
              />
            </div>
          )}
          {sel.auth && (
            <div className="xs-headers__hint">
              Cle valide : <code>{VALID_KEY}</code>. Videz-la (401) ou changez-la (403) pour voir l'echec.
            </div>
          )}
        </div>
        )}

        {sel.body !== null && (
          <div className="xs-body">
            <div className="xs-body__label">
              Corps (JSON)
              {!bodyValid && <span className="xs-body__err">JSON invalide</span>}
            </div>
            <textarea
              className={"xs-body__ta " + (bodyValid ? "" : "invalid")}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              spellCheck={false}
              rows={bodyText.split("\n").length + 1}
            />
          </div>
        )}
      </div>

      <div className={"xs-card " + (phase === "process" ? "live" : "")}>
        <span className="xs-tag xs-tag--proc">Traitement serveur</span>
        <ol className="xs-steps">
          {sel.steps.map((s, i) => {
            const active = phase === "process" && i === activeStep;
            const done = (phase === "process" && i < activeStep) || isResp;
            const isDb = i === sel.dbStep;
            const isAuth = sel.auth && i === 0;
            return (
              <li key={i} className={"xs-step " + (active ? "active" : "") + " " + (done ? "done" : "")}>
                <span className="xs-step__dot" />
                <span>{s}</span>
                {isAuth && <span className="xs-step__badge xs-step__badge--auth"><Lock size={11} /> auth</span>}
                {isDb && <span className="xs-step__badge"><Database size={12} /> base</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className={"xs-card " + (phase === "done" ? "reveal" : "")}>
        <div className="xs-card__h">
          <span className="xs-tag xs-tag--res">Reponse</span>
          {phase === "done" && result && (
            <>
              <span className="xs-status" style={{ background: sc.bg, color: sc.fg }}>
                {result.status >= 400 ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                {result.status}
              </span>
              {result.mutated && <span className="xs-mutated"><Database size={12} /> base modifiee</span>}
            </>
          )}
        </div>
        <div aria-live="polite">
          {phase === "done" && result ? (
            result.response === null
              ? <div className="xs-ph">204 No Content - aucun corps retourne.</div>
              : result.raw
                ? <pre className="xs-json">{String(result.response)}</pre>
                : <pre className="xs-json">{JSON.stringify(result.response, null, 2)}</pre>
          ) : (
            <div className="xs-ph">{phase === "idle" ? "Lance la requete pour voir la reponse." : "En attente..."}</div>
          )}
        </div>
      </div>

      <div className="xs-ctrl">
        <button className="xs-run" onClick={run} disabled={phase !== "idle" && phase !== "done"}>
          <Play size={16} fill="currentColor" />
          {phase === "idle" || phase === "done" ? "Envoyer la requete" : "En cours..."}
        </button>
        {phase === "done" && (
          <button className="xs-reset" onClick={reset}>
            <RotateCcw size={15} /> Rejouer
          </button>
        )}
      </div>
    </div>
  );
}

const CSS = `
.xs {
  --b: #e2e0db; --bg: #fff; --raised: #f8f7f4; --txt: #1a1a2e;
  --mut: #6b6b80; --acc: #0d9488;
  font-family: 'DM Sans', system-ui, sans-serif; color: var(--txt);
  border: 1px solid var(--b); border-radius: 16px; padding: 22px;
  background: var(--bg); max-width: 760px; margin: 2rem auto;
}
.xs * { box-sizing: border-box; }

.xs-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.xs-top__title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mut); }
.xs-icon-btn { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 0.82rem; font-weight: 600; padding: 6px 12px; border: 1px solid var(--b); border-radius: 8px; background: var(--bg); color: var(--txt); cursor: pointer; }
.xs-icon-btn:hover { border-color: var(--mut); }
.xs-icon-btn--ghost { border: none; padding: 4px 8px; color: var(--mut); }

.xs-seed { border: 1px solid var(--acc); border-radius: 12px; padding: 16px; margin-bottom: 18px; background: color-mix(in srgb, var(--acc) 4%, transparent); }
.xs-seed__head { display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 0.9rem; margin-bottom: 6px; }
.xs-seed__head-actions { display: flex; align-items: center; gap: 4px; }
.xs-seed__note { font-size: 0.8rem; color: var(--mut); margin: 0 0 14px; line-height: 1.5; }
.xs-seed__coll { margin-bottom: 12px; }
.xs-seed__coll-name { display: flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; font-weight: 700; color: var(--acc); margin-bottom: 5px; }
.xs-seed__coll-name span { color: var(--mut); font-weight: 400; }
.xs-seed__changed { font-size: 0.62rem; font-weight: 700; color: #92400e; background: #fef3c7; padding: 1px 7px; border-radius: 10px; text-transform: uppercase; }
.xs-seed__json { margin: 0; padding: 10px 12px; background: #1e1e2e; color: #cdd6f4; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; line-height: 1.5; overflow-x: auto; }

.xs-picker { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
.xs-chip { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid var(--b); border-radius: 10px; background: var(--bg); cursor: pointer; font: inherit; text-align: left; transition: all .15s; }
.xs-chip:hover { border-color: var(--mut); }
.xs-chip.on { border-color: var(--acc); background: color-mix(in srgb, var(--acc) 5%, transparent); box-shadow: 0 0 0 1px var(--acc); }
.xs-chip__m { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 5px; flex-shrink: 0; min-width: 54px; text-align: center; }
.xs-chip > span:nth-child(2) { font-size: 0.88rem; font-weight: 500; }
.xs-chip__lock { margin-left: auto; color: var(--mut); }

.xs-stage { display: grid; grid-template-columns: 1fr 2.2fr 1.5fr; align-items: center; gap: 6px; padding: 24px 12px; margin-bottom: 20px; background: var(--raised); border-radius: 14px; }
.xs-node { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 10px; border-radius: 12px; background: var(--bg); border: 1px solid var(--b); color: var(--mut); transition: all .3s; }
.xs-node.lit { border-color: var(--acc); color: var(--acc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 14%, transparent); }
.xs-node__n { font-size: 0.8rem; font-weight: 700; color: var(--txt); }
.xs-node.beat { border-color: var(--acc); color: var(--acc); animation: xs-beat 0.9s ease-in-out infinite; }
@keyframes xs-beat { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--acc) 30%, transparent); transform: scale(1); } 50% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--acc) 0%, transparent); transform: scale(1.04); } }

.xs-wire { position: relative; height: 56px; }
.xs-wire__track { position: absolute; top: 50%; left: 0; right: 0; height: 3px; transform: translateY(-50%); border-radius: 2px; background: repeating-linear-gradient(90deg, var(--b) 0 7px, transparent 7px 14px); }
.xs-wire__flow { position: absolute; top: 50%; left: 0; right: 0; height: 3px; transform: translateY(-50%); border-radius: 2px; opacity: 0; background: repeating-linear-gradient(90deg, var(--wc) 0 7px, transparent 7px 14px); }
.xs-wire__flow.fwd { opacity: 1; animation: xs-flow-fwd 0.5s linear infinite; }
.xs-wire__flow.bwd { opacity: 1; animation: xs-flow-bwd 0.5s linear infinite; }
@keyframes xs-flow-fwd { to { background-position: 14px 0; } }
@keyframes xs-flow-bwd { to { background-position: -14px 0; } }

.xs-pkt { position: absolute; top: 50%; left: 4px; display: inline-flex; align-items: center; transform: translateY(-50%) scale(0.7); font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 700; padding: 5px 9px; border-radius: 8px; opacity: 0; box-shadow: 0 4px 14px rgba(0,0,0,.16); white-space: nowrap; transition: left .9s cubic-bezier(.45,.05,.55,.95), transform .9s, opacity .25s; }
.xs-pkt.show { opacity: 1; transform: translateY(-50%) scale(1); }
.xs-pkt.at-server { left: calc(100% - 38px); }
.xs-pkt.at-client { left: 4px; }

.xs-srv { display: flex; align-items: center; gap: 8px; justify-content: center; }
.xs-db { display: flex; align-items: center; justify-content: center; padding: 10px; border-radius: 10px; color: var(--mut); opacity: 0.5; transition: all .3s; }
.xs-db.query { opacity: 1; color: var(--acc); background: color-mix(in srgb, var(--acc) 10%, transparent); animation: xs-beat 0.6s ease-in-out infinite; }

.xs-card { border: 1px solid var(--b); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; background: var(--bg); transition: all .3s; }
.xs-card.live { border-color: var(--acc); box-shadow: 0 0 0 2px color-mix(in srgb, var(--acc) 12%, transparent); }
.xs-card.reveal { animation: xs-rev .4s cubic-bezier(.16,1,.3,1); }
@keyframes xs-rev { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.xs-card__h { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.xs-tag { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 9px; border-radius: 6px; }
.xs-tag--req { background: #eef3fb; color: #1e40af; }
.xs-tag--proc { background: color-mix(in srgb, var(--acc) 14%, transparent); color: var(--acc); }
.xs-tag--res { background: #f0fdf4; color: #166534; }
.xs-method { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 5px; }
.xs-path { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; word-break: break-all; flex: 1; }
.xs-copy { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 0.72rem; font-weight: 600; padding: 4px 9px; border: 1px solid var(--b); border-radius: 6px; background: var(--bg); color: var(--mut); cursor: pointer; }
.xs-copy:hover { border-color: var(--mut); color: var(--txt); }

.xs-params { display: flex; flex-direction: column; gap: 7px; margin-top: 12px; }
.xs-param { display: grid; grid-template-columns: 130px 1fr; align-items: center; gap: 10px; }
.xs-param__k { display: flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--txt); }
.xs-param__in { font-size: 0.6rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; }
.xs-param__in--path { background: #fef3c7; color: #92400e; }
.xs-param__in--query { background: #ede9fe; color: #6d28d9; }
.xs-param__v { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; padding: 7px 10px; border: 1px solid var(--b); border-radius: 7px; background: var(--raised); color: var(--txt); }
.xs-param__v:focus { outline: 2px solid var(--acc); outline-offset: -1px; }

.xs-headers { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--b); }
.xs-headers__label { font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mut); margin-bottom: 8px; }
.xs-header { display: grid; grid-template-columns: 130px 1fr; align-items: center; gap: 10px; margin-bottom: 6px; }
.xs-header__k { font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; color: var(--mut); }
.xs-header__v { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; padding: 6px 10px; border: 1px solid var(--b); border-radius: 7px; background: var(--raised); color: var(--txt); }
.xs-header__v:focus { outline: 2px solid var(--acc); outline-offset: -1px; }
.xs-header__v.ok { border-color: #22c55e; }
.xs-header__v.bad { border-color: #ef4444; }
.xs-header__static { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: var(--mut); padding: 6px 0; }
.xs-headers__hint { font-size: 0.74rem; color: var(--mut); margin-top: 6px; }
.xs-headers__hint code { font-family: 'JetBrains Mono', monospace; background: var(--raised); padding: 1px 5px; border-radius: 4px; font-size: 0.92em; }

.xs-body { margin-top: 14px; }
.xs-body__label { font-size: 0.7rem; color: var(--mut); margin-bottom: 5px; display: flex; align-items: center; gap: 8px; }
.xs-body__err { font-size: 0.66rem; font-weight: 700; color: #991b1b; background: #fee2e2; padding: 1px 7px; border-radius: 10px; }
.xs-body__ta { width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; line-height: 1.5; padding: 10px 12px; border: 1px solid var(--b); border-radius: 8px; background: var(--raised); color: var(--txt); resize: vertical; }
.xs-body__ta:focus { outline: 2px solid var(--acc); outline-offset: -1px; }
.xs-body__ta.invalid { border-color: #ef4444; }

.xs-steps { list-style: none; padding: 0; margin: 12px 0 0; }
.xs-step { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 0.86rem; color: var(--mut); transition: color .2s; }
.xs-step__dot { width: 9px; height: 9px; border-radius: 50%; border: 2px solid var(--b); flex-shrink: 0; transition: all .2s; }
.xs-step.active { color: var(--txt); font-weight: 600; }
.xs-step.active .xs-step__dot { border-color: var(--acc); background: var(--acc); box-shadow: 0 0 0 4px color-mix(in srgb, var(--acc) 18%, transparent); }
.xs-step.done { color: var(--txt); }
.xs-step.done .xs-step__dot { border-color: var(--acc); background: var(--acc); }
.xs-step__badge { display: inline-flex; align-items: center; gap: 3px; font-size: 0.66rem; font-weight: 600; color: var(--acc); background: color-mix(in srgb, var(--acc) 10%, transparent); padding: 1px 7px; border-radius: 10px; margin-left: auto; }
.xs-step__badge--auth { color: #92400e; background: #fef3c7; }
.xs-step:has(.xs-step__badge--auth) .xs-step__badge { margin-left: auto; }

.xs-status { display: inline-flex; align-items: center; gap: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; font-weight: 700; padding: 3px 10px; border-radius: 6px; margin-left: auto; }
.xs-mutated { display: inline-flex; align-items: center; gap: 4px; font-size: 0.68rem; font-weight: 600; color: #92400e; background: #fef3c7; padding: 3px 9px; border-radius: 10px; }
.xs-json { margin: 12px 0 0; padding: 14px 16px; background: #1e1e2e; color: #cdd6f4; border-radius: 10px; font-family: 'JetBrains Mono', monospace; font-size: 0.78rem; line-height: 1.55; overflow-x: auto; }
.xs-ph { margin-top: 10px; padding: 16px; text-align: center; color: var(--mut); font-size: 0.85rem; font-style: italic; background: var(--raised); border-radius: 8px; }

.xs-ctrl { display: flex; gap: 10px; }
.xs-run { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex: 1; font: inherit; font-size: 0.9rem; font-weight: 600; padding: 11px 20px; border-radius: 10px; cursor: pointer; border: none; background: var(--acc); color: #fff; transition: all .18s; }
.xs-run:hover:not(:disabled) { filter: brightness(1.08); }
.xs-run:disabled { opacity: 0.5; cursor: default; }
.xs-reset { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 0.9rem; font-weight: 600; padding: 11px 18px; border-radius: 10px; cursor: pointer; border: 1px solid var(--b); background: none; color: var(--mut); }
.xs-reset:hover { color: var(--txt); border-color: var(--mut); }

@media (max-width: 560px) {
  .xs { padding: 16px; }
  .xs-stage { grid-template-columns: 1fr; gap: 14px; }
  .xs-wire { height: 40px; }
  .xs-param, .xs-header { grid-template-columns: 1fr; gap: 3px; }
}
`;