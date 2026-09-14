import { useState, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Inspecteur de requête
//
// Montre, en direct, comment PHP remplit $_GET, $_POST et $_SERVER à partir
// d'une requête : on choisit la méthode, on écrit le chemin avec sa chaîne de
// requête, et (en POST) les champs du formulaire. Le parsing reproduit le
// comportement de PHP : paires nom=valeur, séparateur &, et tableaux avec [].
// ─────────────────────────────────────────────────────────────────────────────

function decode(s) {
  try {
    return decodeURIComponent(String(s).replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

// Transforme une chaîne « a=1&b=2&c[]=x&c[]=y » en objet, comme PHP.
function parsePairs(chaine) {
  const result = {};
  if (!chaine) return result;
  for (const pair of chaine.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const rawKey = i === -1 ? pair : pair.slice(0, i);
    const rawVal = i === -1 ? '' : pair.slice(i + 1);
    const key = decode(rawKey);
    const val = decode(rawVal);
    const m = key.match(/^(.+?)\[\]$/);
    if (m) {
      const base = m[1];
      if (!Array.isArray(result[base])) result[base] = [];
      result[base].push(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

// Champs « nom=valeur » saisis ligne par ligne -> chaîne façon corps de formulaire.
function lignesVersChaine(texte) {
  return String(texte)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('&');
}

function phpScalaire(v) {
  return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

// Rend un objet sous la forme d'un tableau PHP lisible.
function phpTableau(obj) {
  const entrees = Object.entries(obj);
  if (entrees.length === 0) return '[]';
  const lignes = entrees.map(([k, v]) => {
    if (Array.isArray(v)) {
      const inner = v.map((x) => '        ' + phpScalaire(x) + ',').join('\n');
      return '    ' + phpScalaire(k) + ' => [\n' + inner + '\n    ],';
    }
    return '    ' + phpScalaire(k) + ' => ' + phpScalaire(v) + ',';
  });
  return '[\n' + lignes.join('\n') + '\n]';
}

const presets = [
  {
    label: 'GET simple',
    methode: 'GET',
    url: '/index.php?page=produits&categorie=sirop',
    champs: '',
  },
  {
    label: 'POST avec chaîne de requête',
    methode: 'POST',
    url: '/index.php?page=commande',
    champs: 'nom=Ti-Jean\ncourriel=tijean@exemple.test\nquantite=3',
  },
  {
    label: 'Paramètre répété',
    methode: 'GET',
    url: '/index.php?categorie[]=sirop&categorie[]=miel',
    champs: '',
  },
];

const css = `
.rqi { border:1px solid var(--sl-color-gray-5, #e6e9ef); border-radius:12px; overflow:hidden;
  background:var(--sl-color-bg, #fff); margin:1.5rem 0; }
.rqi-head { padding:10px 14px; border-bottom:1px solid var(--sl-color-gray-5, #e6e9ef);
  background:var(--sl-color-gray-6, #f7f8fa); }
.rqi-title { font-size:12px; font-weight:700; letter-spacing:.03em;
  color:var(--sl-color-accent, #4f46e5); }
.rqi-sub { font-size:12px; color:var(--sl-color-gray-3, #6b7280); margin-top:2px; }
.rqi-body { padding:14px; display:flex; flex-direction:column; gap:12px; }
.rqi-row { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.rqi-seg { display:inline-flex; border:1px solid var(--sl-color-gray-5, #d7dce6); border-radius:8px; overflow:hidden; }
.rqi-seg button { font-family:var(--sl-font-mono, 'Fira Code', monospace); font-size:12px; font-weight:700;
  padding:5px 14px; border:0; background:transparent; color:var(--sl-color-gray-2, #515a6e); cursor:pointer; }
.rqi-seg button + button { border-left:1px solid var(--sl-color-gray-5, #d7dce6); }
.rqi-seg button[data-on="true"] { background:var(--sl-color-accent-low, #eef0fe); color:var(--sl-color-accent, #4f46e5); }
.rqi-field { display:flex; flex-direction:column; gap:4px; }
.rqi-label { font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase;
  color:var(--sl-color-gray-3, #8a93a6); }
.rqi-input, .rqi-area { font-family:var(--sl-font-mono, 'Fira Code', monospace); font-size:13px;
  padding:8px 10px; border:1px solid var(--sl-color-gray-5, #d7dce6); border-radius:8px;
  background:var(--sl-color-bg, #fff); color:var(--sl-color-text, #1c2230); width:100%; box-sizing:border-box; }
.rqi-area { resize:vertical; min-height:64px; line-height:1.5; }
.rqi-input:focus, .rqi-area:focus { outline:2px solid var(--sl-color-accent, #4f46e5); outline-offset:1px; border-color:transparent; }
.rqi-presets { display:flex; flex-wrap:wrap; gap:6px; }
.rqi-chip { font-size:11px; font-weight:600; padding:4px 9px; border-radius:999px; cursor:pointer;
  border:1px solid var(--sl-color-gray-5, #d7dce6); background:transparent; color:var(--sl-color-gray-2, #515a6e); }
.rqi-chip:hover { background:var(--sl-color-gray-6, #f1f2f6); }
.rqi-out { display:grid; gap:10px; }
.rqi-block { border:1px solid var(--sl-color-gray-5, #e6e9ef); border-radius:8px; overflow:hidden; }
.rqi-block-head { font-family:var(--sl-font-mono, 'Fira Code', monospace); font-size:11px; font-weight:700;
  padding:5px 10px; background:var(--sl-color-gray-6, #f7f8fa); color:var(--sl-color-gray-2, #515a6e);
  border-bottom:1px solid var(--sl-color-gray-5, #e6e9ef); }
.rqi-pre { margin:0; padding:9px 11px; font-family:var(--sl-font-mono, 'Fira Code', monospace);
  font-size:12.5px; line-height:1.55; white-space:pre-wrap; word-break:break-word;
  color:var(--sl-color-text, #2b3245); overflow-x:auto; }
.rqi-empty { color:var(--sl-color-gray-3, #94a3b8); }
`;

export default function RequeteInspecteur() {
  const [methode, setMethode] = useState('GET');
  const [url, setUrl] = useState('/index.php?page=produits&categorie=sirop');
  const [champs, setChamps] = useState('');

  const { chemin, query } = useMemo(() => {
    const q = url.indexOf('?');
    return q === -1
      ? { chemin: url, query: '' }
      : { chemin: url.slice(0, q), query: url.slice(q + 1) };
  }, [url]);

  const get = useMemo(() => parsePairs(query), [query]);
  const post = useMemo(
    () => (methode === 'POST' ? parsePairs(lignesVersChaine(champs)) : {}),
    [methode, champs]
  );

  const server = {
    REQUEST_METHOD: methode,
    REQUEST_URI: url,
    QUERY_STRING: query,
  };

  const appliquer = (p) => {
    setMethode(p.methode);
    setUrl(p.url);
    setChamps(p.champs);
  };

  const blocServer =
    'REQUEST_METHOD => ' + phpScalaire(server.REQUEST_METHOD) + '\n' +
    'REQUEST_URI    => ' + phpScalaire(server.REQUEST_URI) + '\n' +
    'QUERY_STRING   => ' + phpScalaire(server.QUERY_STRING);

  return (
    <div className="rqi">
      <style>{css}</style>

      <div className="rqi-head">
        <div className="rqi-title">Inspecteur de requête</div>
        <div className="rqi-sub">Modifiez la requête et observez comment PHP remplit les superglobales.</div>
      </div>

      <div className="rqi-body">
        <div className="rqi-presets">
          {presets.map((p) => (
            <button key={p.label} className="rqi-chip" onClick={() => appliquer(p)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="rqi-row">
          <div className="rqi-seg" role="group" aria-label="Méthode HTTP">
            {['GET', 'POST'].map((m) => (
              <button key={m} data-on={methode === m} onClick={() => setMethode(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="rqi-field">
          <label className="rqi-label" htmlFor="rqi-url">Chemin et chaîne de requête</label>
          <input
            id="rqi-url"
            className="rqi-input"
            value={url}
            spellCheck={false}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {methode === 'POST' && (
          <div className="rqi-field">
            <label className="rqi-label" htmlFor="rqi-champs">Champs du formulaire (nom=valeur, un par ligne)</label>
            <textarea
              id="rqi-champs"
              className="rqi-area"
              value={champs}
              spellCheck={false}
              placeholder={'nom=Ti-Jean\ncourriel=tijean@exemple.test'}
              onChange={(e) => setChamps(e.target.value)}
            />
          </div>
        )}

        <div className="rqi-out">
          <div className="rqi-block">
            <div className="rqi-block-head">$_GET</div>
            <pre className="rqi-pre">{phpTableau(get)}</pre>
          </div>

          <div className="rqi-block">
            <div className="rqi-block-head">$_POST</div>
            <pre className="rqi-pre">
              {methode === 'GET'
                ? <span className="rqi-empty">[]   (vide : la requête n'est pas un POST)</span>
                : phpTableau(post)}
            </pre>
          </div>

          <div className="rqi-block">
            <div className="rqi-block-head">$_SERVER (extrait)</div>
            <pre className="rqi-pre">{blocServer}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}