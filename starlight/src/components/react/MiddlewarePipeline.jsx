import { useState, useEffect, useRef } from "react";
import { Laptop, Server, Lock, CheckCircle2, XCircle } from "lucide-react";

/**
 * MiddlewarePipeline (îlot Astro, hydraté client:visible)
 *
 * Composant animé et configurable illustrant le middleware sous deux vues :
 *   - pipeline : le motif pipe-et-filtre (la requête traverse les filtres)
 *   - sequence : un diagramme de séquence à une ligne de vie PAR middleware
 *                (Client, chaque middleware, gestionnaire), avec payload sur la
 *                requête, en-tête Authorization, et réponse à badge de statut.
 *
 * Props :
 *   vue        : "pipeline" | "sequence" | "les-deux"  (défaut "les-deux")
 *   interactif : booléen — contrôles d'ajout/retrait et de scénario
 *   initial    : string[] — ids actifs au départ
 *   titre      : string   — légende optionnelle
 *
 * Ids reconnus : journalisation, json, authentification, autorisation.
 */

const CATALOGUE = {
  journalisation: { label: "journalisation", court: "journ." },
  json: { label: "lecture JSON", court: "json" },
  authentification: { label: "authentification", court: "authn", verrou: true },
  autorisation: { label: "autorisation", court: "authz", verrou: true },
};
const ORDRE = ["journalisation", "json", "authentification", "autorisation"];

const SCENARIOS = [
  { id: "ok", label: "Accès admin · 200", actifs: ["journalisation", "json", "authentification", "autorisation"], jeton: true, role: "admin" },
  { id: "401", label: "Jeton absent · 401", actifs: ["journalisation", "json", "authentification", "autorisation"], jeton: false, role: "admin" },
  { id: "403", label: "Rôle visiteur · 403", actifs: ["journalisation", "json", "authentification", "autorisation"], jeton: true, role: "visiteur" },
  { id: "ordre", label: "Autorisation avant authn · 401", actifs: ["autorisation", "authentification"], jeton: true, role: "admin" },
  { id: "min", label: "Journalisation seule · 200", actifs: ["journalisation"], jeton: true, role: "admin" },
];

const ACCENT = "#0d9488";
const ROUGE = "#dc2626";
const AMBRE = "#d97706";

/* Palette de statut, alignée sur ExchangeSimulator. */
const statutCouleur = (s) =>
  s >= 500 ? { bg: "#fef3c7", fg: "#92400e", trait: "#d97706" }
  : s >= 400 ? { bg: "#fee2e2", fg: "#991b1b", trait: "#ef4444" }
  : { bg: "#dcfce7", fg: "#166534", trait: "#22c55e" };

/* Évalue le parcours : où la chaîne se coupe, et avec quel code. */
function evaluer(actifs, { jeton, role }) {
  let authentifie = false;
  for (let i = 0; i < actifs.length; i++) {
    const id = actifs[i];
    if (id === "authentification") {
      if (jeton) authentifie = true;
      else return { coupeA: i, code: 401, raison: "non authentifié" };
    }
    if (id === "autorisation") {
      if (!authentifie) return { coupeA: i, code: 401, raison: "aucun utilisateur posé" };
      if (role !== "admin") return { coupeA: i, code: 403, raison: "accès interdit" };
    }
  }
  return { coupeA: null, code: 200, raison: "ressource servie" };
}

function corpsReponse(verdict) {
  if (verdict.code === 200) return '{ "rapports": [] }';
  return `{ "erreur": "${verdict.raison}" }`;
}
function cheminRequete(actifs) {
  if (actifs.includes("autorisation")) return "GET /admin/rapports";
  if (actifs.includes("authentification")) return "GET /profil";
  return "GET /api/ressource";
}

export default function MiddlewarePipeline({
  vue = "les-deux",
  interactif = false,
  initial = ["journalisation", "json", "authentification", "autorisation"],
  titre,
}) {
  const [actifs, setActifs] = useState(initial.filter((id) => CATALOGUE[id]));
  const [jeton, setJeton] = useState(true);
  const [role, setRole] = useState("admin");
  const [etape, setEtape] = useState(-1);
  const [enCours, setEnCours] = useState(false);
  const [demandeRun, setDemandeRun] = useState(false);
  const minuterie = useRef(null);

  const verdict = evaluer(actifs, { jeton, role });
  const stop = verdict.coupeA != null ? verdict.coupeA : actifs.length;
  const etapeMax = stop;
  const termine = etape >= etapeMax;

  const nettoyer = () => { if (minuterie.current) { clearInterval(minuterie.current); minuterie.current = null; } };
  useEffect(() => nettoyer, []);

  function lancer() {
    nettoyer();
    setEtape(0); setEnCours(true);
    let i = 0;
    minuterie.current = setInterval(() => {
      i += 1;
      if (i > etapeMax) { nettoyer(); setEnCours(false); setEtape(etapeMax); return; }
      setEtape(i);
    }, 850);
  }
  const reinitialiser = () => { nettoyer(); setEnCours(false); setEtape(-1); };

  function basculer(id) {
    reinitialiser();
    setActifs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : ORDRE.filter((x) => x === id || prev.includes(x)),
    );
  }

  // Auto-exécute après qu'un scénario a fixé l'état (un seul rendu groupé).
  useEffect(() => { if (demandeRun) { setDemandeRun(false); lancer(); } }, [demandeRun]);
  function appliquer(s) {
    nettoyer(); setEnCours(false); setEtape(-1);
    setActifs(s.actifs.filter((id) => CATALOGUE[id]));
    setJeton(s.jeton); setRole(s.role);
    setDemandeRun(true);
  }

  const estInteractif = interactif === "" || interactif === true || interactif === "true";
  const aAuth = actifs.includes("authentification") || actifs.includes("autorisation");
  const montrePipeline = vue === "pipeline" || vue === "les-deux";
  const montreSequence = vue === "sequence" || vue === "les-deux";

  const etatCase = (i) => {
    if (etape < 0) return "repos";
    if (verdict.coupeA === i && etape >= i) return "coupe";
    if (i < etape) return "fait";
    if (i === etape) return "actif";
    return "attente";
  };

  /* Participants du diagramme : Client, chaque middleware, gestionnaire. */
  const participants = [
    { key: "client", label: "Client", role: "client" },
    ...actifs.map((id) => ({ key: id, label: CATALOGUE[id].court, role: "mw", verrou: CATALOGUE[id].verrou })),
    { key: "gest", label: "gestionnaire", role: "gest" },
  ];
  const N = participants.length;
  const centre = (i) => ((i + 0.5) / N) * 100;

  /* Messages : flèches avant (avancée) puis la réponse. */
  const msgs = [];
  for (let j = 0; j <= stop; j++) msgs.push({ from: j, to: j + 1, dir: "ltr", kind: j === 0 ? "req" : "pass", voirA: j });
  msgs.push({ from: stop + 1, to: 0, dir: "rtl", kind: "resp", voirA: "fin" });
  const ROWH = 60;
  const sc = statutCouleur(verdict.code);

  return (
    <figure className="mwp">
      {estInteractif && (
        <div className="mwp__ctrl">
          <div className="mwp__scen">
            <span className="mwp__scenlab">Scénarios :</span>
            {SCENARIOS.map((s) => (
              <button key={s.id} type="button" className="mwp__scenb" onClick={() => appliquer(s)}>{s.label}</button>
            ))}
          </div>
          <div className="mwp__chips">
            <span className="mwp__scenlab">Middlewares :</span>
            {ORDRE.map((id) => (
              <button key={id} type="button" className={`mwp__chip ${actifs.includes(id) ? "on" : ""}`} onClick={() => basculer(id)}>
                {actifs.includes(id) ? "✓ " : "+ "}{CATALOGUE[id].label}
              </button>
            ))}
          </div>
          {aAuth && (
            <div className="mwp__scenario">
              <label className="mwp__sw">
                <input type="checkbox" checked={jeton} onChange={(e) => { reinitialiser(); setJeton(e.target.checked); }} />
                jeton présent
              </label>
              <label className="mwp__role">
                rôle :
                <select value={role} onChange={(e) => { reinitialiser(); setRole(e.target.value); }}>
                  <option value="admin">admin</option>
                  <option value="visiteur">visiteur</option>
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      <div className="mwp__bar">
        <button className="mwp__play" type="button" onClick={lancer} disabled={enCours || actifs.length === 0}>▶ Lancer la requête</button>
        <button className="mwp__reset" type="button" onClick={reinitialiser}>↺ Réinitialiser</button>
        {termine && etape >= 0 && (
          <span className="mwp__verdict" style={{ background: sc.bg, color: sc.fg }}>
            {verdict.code} · {verdict.raison}
          </span>
        )}
      </div>

      {montrePipeline && (
        <div className="mwp__pipeline" aria-hidden="true">
          <span className="mwp__port">requête</span>
          <span className="mwp__pipe" />
          {[...actifs, "gestionnaire"].map((id, i) => {
            const label = id === "gestionnaire" ? "gestionnaire" : CATALOGUE[id].label;
            return (
              <span key={i} className="mwp__seg">
                <span className={`mwp__filtre ${etatCase(i)} ${id === "gestionnaire" ? "gest" : ""}`}>
                  {label}
                  {verdict.coupeA === i && etape >= i && <span className="mwp__sortie" style={{ background: sc.trait }}>{verdict.code}</span>}
                </span>
                {i < actifs.length && <span className="mwp__pipe" />}
              </span>
            );
          })}
          <span className="mwp__pipe" />
          <span className="mwp__port" style={{ borderColor: termine ? sc.trait : undefined, color: termine ? sc.fg : undefined }}>réponse</span>
        </div>
      )}

      {montreSequence && (
        <div className="mwp__trace">
          <div className="mwp__heads" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
            {participants.map((p, i) => (
              <div key={p.key} className={`mwp__head ${p.role} ${p.role === "gest" && verdict.coupeA != null ? "dim" : ""}`}>
                <span className="mwp__ico">
                  {p.role === "client" ? <Laptop size={16} /> : p.role === "gest" ? <Server size={16} /> : p.verrou ? <Lock size={14} /> : <span className="mwp__num">{i}</span>}
                </span>
                <span className="mwp__hlabel">{p.label}</span>
              </div>
            ))}
          </div>

          <div className="mwp__body" style={{ height: msgs.length * ROWH }}>
            {participants.map((p, i) => (
              <span key={p.key} className="mwp__life" style={{ left: `${centre(i)}%` }} />
            ))}

            {msgs.map((m, idx) => {
              const a = centre(m.from), b = centre(m.to);
              const left = Math.min(a, b), width = Math.abs(b - a);
              const visible = m.voirA === "fin" ? (termine && etape >= 0) : etape >= m.voirA;
              const trait = m.kind === "resp" ? sc.trait : ACCENT;
              return (
                <div key={idx} className={`mwp__row ${visible ? "vu" : ""}`} style={{ top: idx * ROWH }}>
                  <span className={`mwp__line ${m.dir}`} style={{ left: `${left}%`, width: `${width}%`, borderColor: trait }}>
                    <span className="mwp__head-fleche" style={{ borderLeftColor: m.dir === "ltr" ? trait : undefined, borderRightColor: m.dir === "rtl" ? trait : undefined }} />
                  </span>
                  <span className="mwp__bulle" style={{ left: `${(a + b) / 2}%` }}>
                    {m.kind === "req" && (
                      <>
                        <span className="mwp__verbe">{cheminRequete(actifs)}</span>
                        {aAuth && (
                          <span className={`mwp__auth ${jeton ? "ok" : "ko"}`}>
                            <Lock size={11} /> {jeton ? "Authorization: Bearer abc…" : "Authorization absent"}
                          </span>
                        )}
                      </>
                    )}
                    {m.kind === "pass" && <span className="mwp__next">next()</span>}
                    {m.kind === "resp" && (
                      <span className="mwp__resp">
                        <span className="mwp__statut" style={{ background: sc.bg, color: sc.fg }}>
                          {verdict.code >= 400 ? <XCircle size={12} /> : <CheckCircle2 size={12} />} {verdict.code}
                        </span>
                        <span className="mwp__corps">{corpsReponse(verdict)}</span>
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {titre && <figcaption className="mwp__cap">{titre}</figcaption>}

      <style>{`
        .mwp { --a:${ACCENT}; margin:2rem auto; max-width:640px; font-family:"DM Sans",system-ui,sans-serif; color:#1a1a2e; }
        .mwp__ctrl { background:#f5f7f7; border:1px solid #e3e6e6; border-radius:12px; padding:12px 14px; margin-bottom:12px; }
        .mwp__scen { display:flex; flex-wrap:wrap; gap:7px; align-items:center; margin-bottom:10px; }
        .mwp__scenlab { font-size:.74rem; font-weight:700; color:#556; }
        .mwp__scenb { font:inherit; font-size:.76rem; cursor:pointer; padding:5px 11px; border-radius:8px; border:1px solid var(--a); background:#fff; color:var(--a); }
        .mwp__scenb:hover { background:rgba(13,148,136,.08); }
        .mwp__chips { display:flex; flex-wrap:wrap; gap:7px; align-items:center; }
        .mwp__chip { font:inherit; font-size:.8rem; cursor:pointer; padding:5px 12px; border-radius:100px; border:1px solid #c9cfce; background:#fff; color:#556; }
        .mwp__chip.on { background:var(--a); border-color:var(--a); color:#fff; }
        .mwp__scenario { display:flex; gap:16px; align-items:center; margin-top:10px; font-size:.8rem; color:#556; }
        .mwp__sw input, .mwp__role select { margin:0 5px 0 0; accent-color:var(--a); vertical-align:middle; }
        .mwp__role select { font:inherit; font-size:.8rem; padding:2px 6px; border-radius:6px; border:1px solid #c9cfce; }
        .mwp__bar { display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
        .mwp__play, .mwp__reset { font:inherit; font-size:.82rem; cursor:pointer; padding:7px 14px; border-radius:8px; border:1px solid var(--a); }
        .mwp__play { background:var(--a); color:#fff; } .mwp__play:disabled { opacity:.5; cursor:default; }
        .mwp__reset { background:#fff; color:var(--a); }
        .mwp__verdict { font-size:.78rem; font-weight:700; font-variant-numeric:tabular-nums; padding:3px 10px; border-radius:100px; }

        .mwp__pipeline { display:flex; align-items:center; flex-wrap:wrap; row-gap:10px; padding:14px; background:#faf9f7; border-radius:12px; }
        .mwp__seg { display:inline-flex; align-items:center; }
        .mwp__port { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#6b6b80; border:1.5px solid #cdd0d6; border-radius:7px; padding:5px 9px; white-space:nowrap; }
        .mwp__pipe { width:18px; height:2px; background:repeating-linear-gradient(90deg,#cdd0d6 0 5px,transparent 5px 9px); }
        .mwp__filtre { position:relative; font-size:.78rem; padding:7px 11px; border-radius:8px; border:1.5px solid #cdd0d6; background:#fff; color:#556; white-space:nowrap; transition:all .25s ease; }
        .mwp__filtre.gest { border-style:solid; font-weight:600; }
        .mwp__filtre.fait { border-color:var(--a); color:var(--a); opacity:.7; }
        .mwp__filtre.actif { border-color:var(--a); background:var(--a); color:#fff; box-shadow:0 0 0 4px rgba(13,148,136,.18); transform:translateY(-2px); }
        .mwp__filtre.coupe { border-color:${ROUGE}; background:#fff5f5; color:${ROUGE}; box-shadow:0 0 0 4px rgba(220,38,38,.14); }
        .mwp__sortie { position:absolute; top:-9px; right:-9px; color:#fff; font-size:.62rem; font-weight:700; padding:1px 6px; border-radius:100px; }

        .mwp__trace { margin-top:16px; }
        .mwp__heads { display:grid; gap:0; margin-bottom:4px; }
        .mwp__head { display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; }
        .mwp__ico { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:9px; background:var(--a); color:#fff; }
        .mwp__head.client .mwp__ico { background:#334155; }
        .mwp__head.gest .mwp__ico { background:#475569; }
        .mwp__head.dim { opacity:.4; }
        .mwp__num { font-size:.78rem; font-weight:700; }
        .mwp__hlabel { font-size:.72rem; color:#556; max-width:88px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mwp__body { position:relative; }
        .mwp__life { position:absolute; top:0; bottom:0; width:2px; transform:translateX(-1px); background:repeating-linear-gradient(#cdd0d6 0 6px,transparent 6px 12px); }
        .mwp__row { position:absolute; left:0; right:0; height:60px; opacity:0; transform:translateY(7px); transition:opacity .35s ease, transform .35s ease; }
        .mwp__row.vu { opacity:1; transform:none; }
        .mwp__line { position:absolute; top:40px; height:0; border-top:2px solid var(--a); }
        .mwp__head-fleche { position:absolute; top:50%; transform:translateY(-50%); width:0; height:0; border-top:5px solid transparent; border-bottom:5px solid transparent; }
        .mwp__line.ltr .mwp__head-fleche { right:-1px; border-left:8px solid var(--a); }
        .mwp__line.rtl .mwp__head-fleche { left:-1px; border-right:8px solid var(--a); }
        .mwp__bulle { position:absolute; top:4px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:3px; z-index:2; }
        .mwp__verbe { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:.72rem; background:#e0f2fe; color:#075985; padding:2px 9px; border-radius:6px; white-space:nowrap; }
        .mwp__auth { display:inline-flex; align-items:center; gap:4px; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:.64rem; padding:1px 7px; border-radius:6px; white-space:nowrap; }
        .mwp__auth.ok { background:#dcfce7; color:#166534; } .mwp__auth.ko { background:#fee2e2; color:#991b1b; }
        .mwp__next { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:.72rem; color:#6b6b80; background:#faf9f7; padding:1px 8px; border-radius:6px; }
        .mwp__resp { display:flex; align-items:center; gap:7px; background:#faf9f7; padding:1px 6px; border-radius:6px; }
        .mwp__statut { display:inline-flex; align-items:center; gap:3px; font-size:.72rem; font-weight:700; padding:1px 8px; border-radius:100px; font-variant-numeric:tabular-nums; }
        .mwp__corps { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:.68rem; color:#556; white-space:nowrap; }
        .mwp__cap { margin-top:10px; text-align:center; font-size:.78rem; color:#6b6b80; font-style:italic; }

        [data-theme="dark"] .mwp { color:#e8e8f0; }
        [data-theme="dark"] .mwp__ctrl { background:#1c2230; border-color:#2c3444; }
        [data-theme="dark"] .mwp__chip { background:#242b3a; border-color:#3a4356; color:#b8c0d0; }
        [data-theme="dark"] .mwp__scenb { background:#242b3a; }
        [data-theme="dark"] .mwp__scenlab { color:#9aa3b2; }
        [data-theme="dark"] .mwp__pipeline, [data-theme="dark"] .mwp__next, [data-theme="dark"] .mwp__resp { background:#161b26; }
        [data-theme="dark"] .mwp__filtre { background:#242b3a; border-color:#3a4356; color:#b8c0d0; }
        [data-theme="dark"] .mwp__hlabel, [data-theme="dark"] .mwp__corps { color:#9aa3b2; }
        [data-theme="dark"] .mwp__role select { background:#242b3a; color:#b8c0d0; border-color:#3a4356; }
      `}</style>
    </figure>
  );
}