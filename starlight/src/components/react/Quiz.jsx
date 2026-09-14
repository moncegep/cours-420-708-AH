import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

/**
 * Quiz (îlot Astro, hydraté client:visible)
 *
 * Quiz à choix unique, accessible et thémé, dans le style de FluxSequence et
 * MiddlewarePipeline. Accessibilité : chaque option est un bouton ; une région
 * role="status" annonce le résultat (bonne réponse et explication, ou invitation
 * à réessayer) ; les transitions respectent prefers-reduced-motion.
 *
 * Props :
 *   question : string
 *   options  : [{ texte, correct }]
 *   retour?  : string   explication révélée à la bonne réponse
 */

const ACCENT = "#0d9488";

export default function Quiz({ question, options = [], retour }) {
  const [resolu, setResolu] = useState(false);
  const [rates, setRates] = useState([]);

  function repondre(i) {
    if (resolu) return;
    if (options[i]?.correct) {
      setResolu(true);
    } else {
      setRates((prev) => (prev.includes(i) ? prev : [...prev, i]));
    }
  }

  return (
    <figure className="qz" role="group" aria-label={question}>
      <p className="qz__q"><strong>Quiz.</strong> {question}</p>

      <ul className="qz__opts" role="list">
        {options.map((opt, i) => {
          const bon = resolu && opt.correct;
          const rate = rates.includes(i);
          return (
            <li key={i}>
              <button
                type="button"
                className={`qz__opt ${bon ? "bon" : ""} ${rate ? "rate" : ""}`}
                onClick={() => repondre(i)}
                disabled={resolu || rate}
              >
                <span className="qz__txt">{opt.texte}</span>
                {bon && <CheckCircle2 size={16} aria-hidden="true" />}
                {rate && <XCircle size={16} aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="qz__retour" role="status">
        {resolu ? (retour ?? "Bonne réponse.") : rates.length ? "Pas tout à fait, réessaie." : ""}
      </p>

      <style>{`
        .qz { --a:${ACCENT}; margin:1.6rem auto; max-width:640px; font-family:"DM Sans",system-ui,sans-serif; color:#1a1a2e; border:1px solid #e3e6e6; border-radius:12px; padding:14px 16px; background:#f5f7f7; }
        .qz__q { margin:0 0 10px; font-size:.95rem; }
        .qz__opts { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
        .qz__opt { display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%; text-align:left; font:inherit; font-size:.86rem; cursor:pointer; padding:9px 12px; border-radius:8px; border:1px solid #c9cfce; background:#fff; color:#1a1a2e; transition:border-color .2s ease, background .2s ease, transform .2s ease; }
        .qz__opt:hover:not(:disabled) { border-color:var(--a); transform:translateY(-1px); }
        .qz__opt:focus-visible { outline:3px solid #134e4a; outline-offset:2px; }
        .qz__opt:disabled { cursor:default; }
        .qz__opt.bon { border-color:#15803d; background:#dcfce7; color:#166534; font-weight:700; }
        .qz__opt.rate { border-color:#dc2626; background:#fee2e2; color:#991b1b; opacity:.85; }
        .qz__retour { margin:10px 0 0; min-height:1.2em; font-size:.82rem; color:#166534; font-weight:600; }
        .qz__retour:empty { margin:0; min-height:0; }

        @media (prefers-reduced-motion: reduce) { .qz__opt { transition:none; } .qz__opt:hover:not(:disabled) { transform:none; } }

        [data-theme="dark"] .qz { color:#e8e8f0; background:#1c2230; border-color:#2c3444; }
        [data-theme="dark"] .qz__opt { background:#242b3a; border-color:#3a4356; color:#b8c0d0; }
        [data-theme="dark"] .qz__opt.bon { background:rgba(34,197,94,.16); border-color:#22c55e; color:#86efac; }
        [data-theme="dark"] .qz__opt.rate { background:rgba(239,68,68,.16); border-color:#ef4444; color:#fca5a5; }
        [data-theme="dark"] .qz__retour { color:#86efac; }
        [data-theme="dark"] .qz__opt:focus-visible { outline-color:#7dd3c8; }
      `}</style>
    </figure>
  );
}