import { useState, useEffect, useRef } from "react";
import { Laptop, Server, Lock, Database, CheckCircle2, XCircle } from "lucide-react";

/**
 * FluxSequence (îlot Astro, hydraté client:visible)
 *
 * Diagramme de séquence animé et réutilisable, à une ligne de vie par acteur.
 * Accessibilité : le rendu visuel est marqué aria-hidden et doublé d'une liste
 * ordonnée des étapes réservée aux lecteurs d'écran ; une région de statut
 * annonce la progression ; l'animation respecte prefers-reduced-motion (les
 * étapes sont alors révélées d'un coup, sans défilement minuté).
 *
 * Props :
 *   titre    : string
 *   acteurs  : [{ key, label, icone? }]   icone ∈ laptop|server|lock|database
 *   etapes   : [{ de, vers, texte, note?, statut?, mono? }]
 */

const ICONES = { laptop: Laptop, server: Server, lock: Lock, database: Database };
const ACCENT = "#0d9488";

const statutCouleur = (s) =>
  s >= 500 ? { bg: "#fef3c7", fg: "#92400e", trait: "#b45309" }
  : s >= 400 ? { bg: "#fee2e2", fg: "#991b1b", trait: "#dc2626" }
  : { bg: "#dcfce7", fg: "#166534", trait: "#15803d" };

export default function FluxSequence({ titre, acteurs = [], etapes = [] }) {
  const [etape, setEtape] = useState(-1);
  const [enCours, setEnCours] = useState(false);
  const [mouvementReduit, setMouvementReduit] = useState(false);
  const minuterie = useRef(null);

  const N = acteurs.length;
  const centre = (i) => ((i + 0.5) / N) * 100;
  const ROWH = 66;

  const nettoyer = () => { if (minuterie.current) { clearInterval(minuterie.current); minuterie.current = null; } };
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMouvementReduit(mq.matches);
    const onChange = (e) => setMouvementReduit(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => { nettoyer(); mq.removeEventListener?.("change", onChange); };
  }, []);

  function lancer() {
    nettoyer();
    if (mouvementReduit) { setEtape(etapes.length - 1); setEnCours(false); return; }
    setEtape(0); setEnCours(true);
    let i = 0;
    minuterie.current = setInterval(() => {
      i += 1;
      if (i >= etapes.length) { nettoyer(); setEnCours(false); setEtape(etapes.length - 1); return; }
      setEtape(i);
    }, 950);
  }
  const reinitialiser = () => { nettoyer(); setEnCours(false); setEtape(-1); };

  const libelle = (e) =>
    e.de === e.vers
      ? `${acteurs[e.de]?.label} : ${e.texte}`
      : `${acteurs[e.de]?.label} vers ${acteurs[e.vers]?.label} : ${e.statut ? e.statut + " · " : ""}${e.texte}${e.note ? " (" + e.note + ")" : ""}`;

  return (
    <figure className="fxs" role="group" aria-label={titre ?? "Diagramme de séquence animé"}>
      <div className="fxs__bar">
        <button className="fxs__play" type="button" onClick={lancer} disabled={enCours || etapes.length === 0}
          aria-label={etape < 0 ? "Lancer l'animation de la séquence" : "Rejouer l'animation de la séquence"}>
          ▶ {etape < 0 ? "Lancer" : "Rejouer"}
        </button>
        <button className="fxs__reset" type="button" onClick={reinitialiser} aria-label="Réinitialiser l'animation">↺ Réinitialiser</button>
        <span className="fxs__prog" aria-hidden="true">{etape >= 0 ? `étape ${etape + 1} / ${etapes.length}` : ""}</span>
      </div>

      {/* Annonce de progression pour lecteurs d'écran */}
      <span className="fxs__sr" role="status">
        {etape >= 0 && etapes[etape] ? `Étape ${etape + 1} sur ${etapes.length}. ${libelle(etapes[etape])}` : ""}
      </span>

      {/* Équivalent textuel complet de la séquence */}
      <ol className="fxs__sr">
        {etapes.map((e, i) => (<li key={i}>{libelle(e)}</li>))}
      </ol>

      <div aria-hidden="true">
        <div className="fxs__heads" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
          {acteurs.map((p, i) => {
            const Ico = ICONES[p.icone];
            return (
              <div key={p.key ?? i} className="fxs__head">
                <span className="fxs__ico">{Ico ? <Ico size={16} /> : <span className="fxs__num">{i + 1}</span>}</span>
                <span className="fxs__hlabel">{p.label}</span>
              </div>
            );
          })}
        </div>

        <div className="fxs__body" style={{ height: Math.max(etapes.length, 1) * ROWH }}>
          {acteurs.map((p, i) => (
            <span key={p.key ?? i} className="fxs__life" style={{ left: `${centre(i)}%` }} />
          ))}

          {etapes.map((e, idx) => {
            const auto = e.de === e.vers;
            const a = centre(e.de), b = centre(e.vers);
            const left = Math.min(a, b), width = Math.abs(b - a);
            const dir = b >= a ? "ltr" : "rtl";
            const sc = e.statut ? statutCouleur(e.statut) : null;
            const trait = sc ? sc.trait : ACCENT;
            const visible = etape >= idx;
            return (
              <div key={idx} className={`fxs__row ${visible ? "vu" : ""}`} style={{ top: idx * ROWH }}>
                {auto ? (
                  <span className="fxs__self" style={{ left: `${a}%` }}>
                    <span className="fxs__selfb">↻ {e.texte}</span>
                  </span>
                ) : (
                  <>
                    <span className={`fxs__line ${dir}`} style={{ left: `${left}%`, width: `${width}%`, borderColor: trait }}>
                      <span className="fxs__fleche" style={{ borderLeftColor: dir === "ltr" ? trait : undefined, borderRightColor: dir === "rtl" ? trait : undefined }} />
                    </span>
                    <span className="fxs__bulle" style={{ left: `${(a + b) / 2}%` }}>
                      {sc ? (
                        <span className="fxs__statut" style={{ background: sc.bg, color: sc.fg }}>
                          {e.statut >= 400 ? <XCircle size={12} /> : <CheckCircle2 size={12} />} {e.statut} · {e.texte}
                        </span>
                      ) : (
                        <span className={`fxs__texte ${e.mono ? "mono" : ""}`}>{e.texte}</span>
                      )}
                      {e.note && <span className="fxs__note">{e.note}</span>}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {titre && <figcaption className="fxs__cap">{titre}</figcaption>}

      <style>{`
        .fxs { --a:${ACCENT}; margin:2rem auto; max-width:640px; font-family:"DM Sans",system-ui,sans-serif; color:#1a1a2e; }
        .fxs__sr { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
        .fxs__bar { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
        .fxs__play, .fxs__reset { font:inherit; font-size:.82rem; cursor:pointer; padding:7px 14px; border-radius:8px; border:1px solid var(--a); }
        .fxs__play { background:var(--a); color:#fff; } .fxs__play:disabled { opacity:.55; cursor:default; }
        .fxs__reset { margin:0; background:#fff; color:#0b7a70; }
        .fxs__play:focus-visible, .fxs__reset:focus-visible { outline:3px solid #134e4a; outline-offset:2px; }
        .fxs__prog { font-size:.74rem; color:#4a4a5a; font-variant-numeric:tabular-nums; }
        .fxs__heads { display:grid; margin-bottom:4px; }
        .fxs__head { display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center; }
        .fxs__ico { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:9px; background:var(--a); color:#fff; }
        .fxs__num { font-size:.78rem; font-weight:700; }
        .fxs__hlabel { font-size:.74rem; color:#3f3f4e; max-width:96px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .fxs__body { position:relative; }
        .fxs__life { position:absolute; top:0; bottom:0; width:2px; transform:translateX(-1px); background:repeating-linear-gradient(#b9bcc6 0 6px,transparent 6px 12px); }
        .fxs__row { position:absolute; left:0; right:0; height:66px; opacity:0; transform:translateY(7px); transition:opacity .35s ease, transform .35s ease; }
        .fxs__row.vu { opacity:1; transform:none; }
        @media (prefers-reduced-motion: reduce) { .fxs__row { transition:none; transform:none; } }
        .fxs__line { position:absolute; top:44px; height:0; border-top:2px solid var(--a); }
        .fxs__fleche { position:absolute; top:50%; transform:translateY(-50%); width:0; height:0; border-top:5px solid transparent; border-bottom:5px solid transparent; }
        .fxs__line.ltr .fxs__fleche { right:-1px; border-left:8px solid var(--a); }
        .fxs__line.rtl .fxs__fleche { left:-1px; border-right:8px solid var(--a); }
        .fxs__bulle { position:absolute; top:14px; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:3px; z-index:2; max-width:46%; }
        .fxs__texte { font-size:.76rem; background:#faf9f7; padding:2px 9px; border-radius:6px; text-align:center; white-space:nowrap; }
        .fxs__texte.mono { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:.7rem; background:#e0f2fe; color:#075985; }
        .fxs__statut { display:inline-flex; align-items:center; gap:4px; font-size:.72rem; font-weight:700; padding:2px 9px; border-radius:100px; white-space:nowrap; }
        .fxs__note { font-size:.8rem; color:#4a4a5a; font-style:italic; text-align:center; }
        .fxs__self { position:absolute; top:30px; transform:translateX(-50%); }
        .fxs__selfb { font-size:.7rem; color:#3f3f4e; background:#faf9f7; border:1px dashed #b9bcc6; padding:2px 9px; border-radius:6px; white-space:nowrap; }
        .fxs__cap { margin-top:10px; text-align:center; font-size:.78rem; color:#4a4a5a; font-style:italic; }

        [data-theme="dark"] .fxs { color:#e8e8f0; }
        [data-theme="dark"] .fxs__texte, [data-theme="dark"] .fxs__selfb { background:#161b26; }
        [data-theme="dark"] .fxs__hlabel, [data-theme="dark"] .fxs__note, [data-theme="dark"] .fxs__prog, [data-theme="dark"] .fxs__cap { color:#aeb6c4; }
        [data-theme="dark"] .fxs__reset { background:#242b3a; color:#7dd3c8; }
        [data-theme="dark"] .fxs__play:focus-visible, [data-theme="dark"] .fxs__reset:focus-visible { outline-color:#7dd3c8; }
      `}</style>
    </figure>
  );
}