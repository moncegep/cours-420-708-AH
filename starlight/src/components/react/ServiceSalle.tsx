import { useEffect, useRef, useState } from 'react';
import './ServiceSalle.css';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Point = { x: number; y: number };
type ActorId = 'lea' | 'sam' | 'marc';
type TableId = 1 | 2 | 3 | 4 | 5 | 6;
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ActorInfo {
  name: string;
  staffId: number;
  role: 'server' | 'kitchen';
  color: string;
}

interface TableState {
  status: 'free' | 'occupied';
  serverId: ActorId | null;
  guests: number;
  waiting: number;
  orderId: number | null;
  plate: boolean;
}

interface Ticket {
  orderId: number;
  tableId: TableId;
}

interface World {
  actors: Record<ActorId, Point>;
  carrying: Record<ActorId, boolean>;
  tables: Record<TableId, TableState>;
  passePlate: boolean;
  tickets: Ticket[];
  orderCount: number;
}

interface HttpRequest {
  actor: ActorId;
  method: HttpMethod;
  path: string;
  body?: unknown;
}

interface HttpResponse {
  status: number;
  body?: unknown;
}

interface Step {
  narration: string;
  moves?: { actor: ActorId; to: Point }[];
  request?: HttpRequest;
  response?: HttpResponse;
  effect?: (w: World) => World;
}

interface Scenario {
  id: string;
  label: string;
  summary: string;
  initial: () => World;
  steps: Step[];
}

interface Packet {
  label: string;
  color: string;
  at: Point;
  ms: number;
}

interface LogEntry {
  id: number;
  actor: ActorId;
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  requestBody?: unknown;
  status: number;
  responseBody?: unknown;
}

/* ------------------------------------------------------------------ */
/* Constantes de mise en page et de domaine                            */
/* ------------------------------------------------------------------ */

const ACTORS: Record<ActorId, ActorInfo> = {
  lea: { name: 'Léa', staffId: 1, role: 'server', color: '#0d9488' },
  sam: { name: 'Sam', staffId: 2, role: 'server', color: '#d97706' },
  marc: { name: 'Marc', staffId: 3, role: 'kitchen', color: '#64748b' },
};

const TABLE_IDS: TableId[] = [1, 2, 3, 4, 5, 6];

const TABLES: Record<TableId, Point> = {
  1: { x: 110, y: 215 },
  2: { x: 260, y: 215 },
  3: { x: 410, y: 215 },
  4: { x: 110, y: 375 },
  5: { x: 260, y: 375 },
  6: { x: 410, y: 375 },
};

/** Position d'un membre du personnel à côté d'une table (à droite ou à gauche). */
const near = (id: TableId, side: 'right' | 'left' = 'right'): Point => ({
  x: TABLES[id].x + (side === 'right' ? 58 : -58),
  y: TABLES[id].y + 4,
});

const HOME: Record<ActorId, Point> = {
  lea: { x: 440, y: 457 },
  sam: { x: 488, y: 457 },
  marc: { x: 120, y: 78 },
};

const PASSE: Point = { x: 270, y: 148 };
const API_ANCHOR: Point = { x: 572, y: 255 };

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
};

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: '#2563eb',
  POST: '#0891b2',
  PUT: '#b45309',
  DELETE: '#dc2626',
};

const statusColor = (status: number): string => (status < 400 ? '#16a34a' : '#ea580c');

const WALK_PX_PER_S = 230;
const PACKET_MS = 750;
const STEP_PAUSE_MS = 900;

/* ------------------------------------------------------------------ */
/* Fonctions utilitaires sur le monde                                  */
/* ------------------------------------------------------------------ */

const freeTable = (): TableState => ({
  status: 'free',
  serverId: null,
  guests: 0,
  waiting: 0,
  orderId: null,
  plate: false,
});

const setTable = (w: World, id: TableId, patch: Partial<TableState>): World => ({
  ...w,
  tables: { ...w.tables, [id]: { ...w.tables[id], ...patch } },
});

const setActor = (w: World, id: ActorId, patch: { carrying?: boolean }): World => ({
  ...w,
  carrying: { ...w.carrying, [id]: patch.carrying ?? w.carrying[id] },
});

const addTicket = (w: World, ticket: Ticket): World => ({
  ...w,
  tickets: [...w.tickets.filter((t) => t.orderId !== ticket.orderId), ticket],
});

const removeTicket = (w: World, orderId: number): World => ({
  ...w,
  tickets: w.tickets.filter((t) => t.orderId !== orderId),
});

/** Enregistre une nouvelle commande dans le dépôt et l'associe à la table. */
const recordOrder = (w: World, tableId: TableId, orderId: number): World => ({
  ...setTable(w, tableId, { orderId }),
  orderCount: w.orderCount + 1,
});

/** Salle de base : Sam sert déjà la table 2 (commande 11). */
const baseWorld = (): World => {
  const tables = {} as Record<TableId, TableState>;
  for (const id of TABLE_IDS) tables[id] = freeTable();
  tables[2] = {
    status: 'occupied',
    serverId: 'sam',
    guests: 2,
    waiting: 0,
    orderId: 11,
    plate: true,
  };
  return {
    actors: { ...HOME },
    carrying: { lea: false, sam: false, marc: false },
    tables,
    passePlate: false,
    tickets: [],
    orderCount: 1,
  };
};

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/* ------------------------------------------------------------------ */
/* Données de réponse réutilisées                                      */
/* ------------------------------------------------------------------ */

const CREATED_AT = '2026-10-15T18:02:00Z';

const ORDER_12_FIRST = [
  { menuItemId: 2, name: 'Tourtière', quantity: 1, unitPriceCents: 2200 },
  { menuItemId: 3, name: 'Poutine', quantity: 1, unitPriceCents: 1600 },
];

const ORDER_12_FINAL = [
  { menuItemId: 2, name: 'Tourtière', quantity: 2, unitPriceCents: 2200 },
  { menuItemId: 3, name: 'Poutine', quantity: 1, unitPriceCents: 1600 },
];

/* ------------------------------------------------------------------ */
/* Scénarios                                                           */
/* ------------------------------------------------------------------ */

const SCENARIOS: Scenario[] = [
  {
    id: 'normal',
    label: 'Service normal',
    summary:
      "Une commande complète : de l'arrivée des clients à la libération de la table. Lance la lecture ou avance étape par étape.",
    initial: baseWorld,
    steps: [
      {
        narration: 'Trois clients arrivent et attendent à la table 4.',
        effect: (w) => setTable(w, 4, { waiting: 3 }),
      },
      {
        narration:
          "Léa se rend à la table 4 et l'installe. Sa tablette envoie une requête : l'en-tête X-Staff-Id l'identifie.",
        moves: [{ actor: 'lea', to: near(4) }],
        request: { actor: 'lea', method: 'POST', path: '/tables/4/seat', body: { guests: 3 } },
        response: {
          status: 200,
          body: { id: 4, number: 4, seats: 4, status: 'occupied', serverId: 1, guests: 3 },
        },
        effect: (w) => setTable(w, 4, { status: 'occupied', serverId: 'lea', guests: 3, waiting: 0 }),
      },
      {
        narration:
          "Léa prend la commande. L'API valide les items et crée la commande 12, en copiant le nom et le prix de chaque item.",
        request: {
          actor: 'lea',
          method: 'POST',
          path: '/orders',
          body: {
            tableId: 4,
            items: [
              { menuItemId: 2, quantity: 1 },
              { menuItemId: 3, quantity: 1 },
            ],
          },
        },
        response: {
          status: 201,
          body: { id: 12, tableId: 4, serverId: 1, items: ORDER_12_FIRST, createdAt: CREATED_AT },
        },
        effect: (w) => recordOrder(w, 4, 12),
      },
      {
        narration:
          'Le troisième client se décide : une tourtière de plus. Léa est la serveuse assignée, elle peut remplacer les lignes de la commande.',
        request: {
          actor: 'lea',
          method: 'PUT',
          path: '/orders/12/items',
          body: {
            items: [
              { menuItemId: 2, quantity: 2 },
              { menuItemId: 3, quantity: 1 },
            ],
          },
        },
        response: {
          status: 200,
          body: { id: 12, tableId: 4, serverId: 1, items: ORDER_12_FINAL, createdAt: CREATED_AT },
        },
      },
      {
        narration: 'Léa retourne à son poste. Aucune requête : se déplacer ne change pas les données.',
        moves: [{ actor: 'lea', to: HOME.lea }],
      },
      {
        narration: "L'écran de la cuisine interroge l'API pour afficher la commande de la table 4.",
        request: { actor: 'marc', method: 'GET', path: '/orders?tableId=4' },
        response: {
          status: 200,
          body: [{ id: 12, tableId: 4, serverId: 1, items: ORDER_12_FINAL, createdAt: CREATED_AT }],
        },
        effect: (w) => addTicket(w, { orderId: 12, tableId: 4 }),
      },
      {
        narration:
          "Marc prépare les plats et les dépose au passe. Aucune requête : dans ce TP, l'API ne suit pas la préparation des plats.",
        effect: (w) => ({ ...removeTicket(w, 12), passePlate: true }),
      },
      {
        narration: 'Léa va chercher les plats au passe.',
        moves: [{ actor: 'lea', to: PASSE }],
        effect: (w) => ({ ...setActor(w, 'lea', { carrying: true }), passePlate: false }),
      },
      {
        narration: "Léa sert la table 4. Ici non plus, aucune requête : le service des plats n'est pas suivi par l'API.",
        moves: [{ actor: 'lea', to: near(4) }],
        effect: (w) => setActor(setTable(w, 4, { plate: true }), 'lea', { carrying: false }),
      },
      {
        narration: "Les clients demandent l'addition. L'API calcule le total avec la TPS et la TVQ.",
        request: { actor: 'lea', method: 'GET', path: '/orders/12/bill' },
        response: {
          status: 200,
          body: { orderId: 12, subtotalCents: 6000, tpsCents: 300, tvqCents: 599, totalCents: 6899 },
        },
      },
      {
        narration: 'Les clients paient et partent. Léa, serveuse assignée, libère la table 4.',
        request: { actor: 'lea', method: 'POST', path: '/tables/4/release' },
        response: {
          status: 200,
          body: { id: 4, number: 4, seats: 4, status: 'free', serverId: null, guests: 0 },
        },
        effect: (w) => setTable(w, 4, freeTable()),
      },
      {
        narration:
          'Léa retourne à son poste. La table 4 est libre ; la commande 12 reste enregistrée dans le dépôt.',
        moves: [{ actor: 'lea', to: HOME.lea }],
      },
    ],
  },
  {
    id: 'refus-400',
    label: 'Refus 400',
    summary:
      "Deux requêtes invalides : une commande mal formée, puis une installation sur une table déjà occupée. Rien n'est enregistré.",
    initial: () => {
      const w = setTable(baseWorld(), 5, { status: 'occupied', serverId: 'sam', guests: 4 });
      return { ...w, actors: { ...w.actors, sam: near(5) } };
    },
    steps: [
      {
        narration: 'Sam saisit une commande pour la table 5, mais deux lignes sont erronées.',
        request: {
          actor: 'sam',
          method: 'POST',
          path: '/orders',
          body: {
            tableId: 5,
            items: [
              { menuItemId: 99, quantity: 1 },
              { menuItemId: 3, quantity: 0 },
            ],
          },
        },
        response: {
          status: 400,
          body: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'La commande est invalide.',
              details: [
                { field: 'items[0].menuItemId', message: "L'item 99 n'existe pas au menu." },
                { field: 'items[1].quantity', message: 'La quantité doit être un entier entre 1 et 20.' },
              ],
            },
          },
        },
      },
      {
        narration:
          "La table 5 n'a toujours aucune commande : un refus ne modifie pas les données. Sam corrige et renvoie.",
        request: {
          actor: 'sam',
          method: 'POST',
          path: '/orders',
          body: {
            tableId: 5,
            items: [
              { menuItemId: 1, quantity: 2 },
              { menuItemId: 3, quantity: 2 },
            ],
          },
        },
        response: {
          status: 201,
          body: {
            id: 13,
            tableId: 5,
            serverId: 2,
            items: [
              { menuItemId: 1, name: "Soupe à l'oignon", quantity: 2, unitPriceCents: 950 },
              { menuItemId: 3, name: 'Poutine', quantity: 2, unitPriceCents: 1600 },
            ],
            createdAt: CREATED_AT,
          },
        },
        effect: (w) => recordOrder(w, 5, 13),
      },
      {
        narration: "Léa veut installer deux clients à la table 5, sans voir qu'elle est déjà occupée.",
        moves: [{ actor: 'lea', to: near(5, 'left') }],
        request: { actor: 'lea', method: 'POST', path: '/tables/5/seat', body: { guests: 2 } },
        response: {
          status: 400,
          body: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'La table 5 est déjà occupée.',
            },
          },
        },
      },
      {
        narration: 'La table 5 reste assignée à Sam. Léa retourne à son poste.',
        moves: [{ actor: 'lea', to: HOME.lea }],
      },
    ],
  },
  {
    id: 'refus-403',
    label: 'Refus 403',
    summary:
      "Sam tente de modifier une commande d'une table qui ne lui est pas assignée. L'API reconnaît qui il est, mais refuse l'action.",
    initial: () => ({
      ...setTable(baseWorld(), 4, { status: 'occupied', serverId: 'lea', guests: 3, orderId: 12 }),
      orderCount: 2,
    }),
    steps: [
      {
        narration: 'Sam passe près de la table 4 et tente de modifier la commande 12 de Léa.',
        moves: [{ actor: 'sam', to: near(4) }],
        request: {
          actor: 'sam',
          method: 'PUT',
          path: '/orders/12/items',
          body: { items: [{ menuItemId: 3, quantity: 3 }] },
        },
        response: {
          status: 403,
          body: {
            error: {
              code: 'FORBIDDEN',
              message: 'Seul le serveur assigné à la table 4 peut modifier cette commande.',
            },
          },
        },
      },
      {
        narration: 'Sam laisse la table à Léa et retourne à son poste.',
        moves: [{ actor: 'sam', to: HOME.sam }],
      },
      {
        narration: "Léa fait la même modification. Elle est la serveuse assignée : c'est accepté.",
        moves: [{ actor: 'lea', to: near(4) }],
        request: {
          actor: 'lea',
          method: 'PUT',
          path: '/orders/12/items',
          body: { items: [{ menuItemId: 3, quantity: 3 }] },
        },
        response: {
          status: 200,
          body: {
            id: 12,
            tableId: 4,
            serverId: 1,
            items: [{ menuItemId: 3, name: 'Poutine', quantity: 3, unitPriceCents: 1600 }],
            createdAt: CREATED_AT,
          },
        },
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

const headersFor = (req: HttpRequest): Record<string, string> => {
  const headers: Record<string, string> = { 'X-Staff-Id': String(ACTORS[req.actor].staffId) };
  if (req.body !== undefined) headers['Content-Type'] = 'application/json';
  return headers;
};

const zeroMoves = (): Record<ActorId, number> => ({ lea: 0, sam: 0, marc: 0 });

export default function ServiceSalle() {
  const [scenarioId, setScenarioId] = useState<string>(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];

  const [world, setWorld] = useState<World>(() => scenario.initial());
  const worldRef = useRef<World>(world);
  const [stepIndex, setStepIndex] = useState(-1);
  const [shownStep, setShownStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [packet, setPacket] = useState<Packet | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [narration, setNarration] = useState(scenario.summary);
  const [badge, setBadge] = useState<{ actor: ActorId; status: number } | null>(null);
  const [moveMs, setMoveMs] = useState<Record<ActorId, number>>(zeroMoves);

  const runRef = useRef(0);
  const logIdRef = useRef(0);
  const speedRef = useRef(1);
  const reducedRef = useRef(false);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /** Durée ajustée à la vitesse choisie (quasi instantanée si mouvement réduit). */
  const dur = (ms: number): number => (reducedRef.current ? 120 : Math.round(ms / speedRef.current));

  const updateWorld = (fn: (w: World) => World) => {
    const next = fn(worldRef.current);
    worldRef.current = next;
    setWorld(next);
  };

  const flyPacket = async (label: string, color: string, from: Point, to: Point) => {
    const ms = dur(PACKET_MS);
    setPacket({ label, color, at: from, ms: 0 });
    await nextFrame();
    await nextFrame();
    setPacket({ label, color, at: to, ms });
    await sleep(ms + 40);
  };

  const runStep = async (index: number) => {
    const step = scenario.steps[index];
    if (!step) return;
    const run = runRef.current;
    const alive = () => runRef.current === run;

    setBusy(true);
    setShownStep(index + 1);
    setBadge(null);
    setNarration(step.narration);

    for (const move of step.moves ?? []) {
      const from = worldRef.current.actors[move.actor];
      const ms = dur((distance(from, move.to) / WALK_PX_PER_S) * 1000);
      setMoveMs((prev) => ({ ...prev, [move.actor]: ms }));
      updateWorld((w) => ({ ...w, actors: { ...w.actors, [move.actor]: move.to } }));
      await sleep(ms + 60);
      if (!alive()) return;
    }

    if (step.request && step.response) {
      const req = step.request;
      const res = step.response;
      const origin = worldRef.current.actors[req.actor];

      await flyPacket(`${req.method} ${req.path}`, METHOD_COLOR[req.method], origin, API_ANCHOR);
      if (!alive()) return;
      await sleep(dur(250));
      if (!alive()) return;
      await flyPacket(`${res.status} ${STATUS_TEXT[res.status] ?? ''}`, statusColor(res.status), API_ANCHOR, origin);
      if (!alive()) return;

      setPacket(null);
      logIdRef.current += 1;
      const entry: LogEntry = {
        id: logIdRef.current,
        actor: req.actor,
        method: req.method,
        path: req.path,
        headers: headersFor(req),
        requestBody: req.body,
        status: res.status,
        responseBody: res.body,
      };
      setLog((prev) => [entry, ...prev]);
      setBadge({ actor: req.actor, status: res.status });
    }

    if (step.effect) updateWorld(step.effect);
    setStepIndex(index);
    setBusy(false);
  };

  const resetTo = (id: string) => {
    const target = SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
    runRef.current += 1;
    setScenarioId(target.id);
    setPlaying(false);
    setBusy(false);
    setPacket(null);
    setBadge(null);
    setMoveMs(zeroMoves());
    const fresh = target.initial();
    worldRef.current = fresh;
    setWorld(fresh);
    setStepIndex(-1);
    setShownStep(0);
    setLog([]);
    setNarration(target.summary);
  };

  const atEnd = stepIndex >= scenario.steps.length - 1;

  useEffect(() => {
    if (!playing || busy) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      void runStep(stepIndex + 1);
    }, stepIndex < 0 ? 200 : dur(STEP_PAUSE_MS));
    return () => clearTimeout(timer);
    // runStep et dur lisent des refs : les dépendances ci-dessous suffisent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, busy, stepIndex, scenarioId]);

  const onPlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (atEnd) resetTo(scenario.id);
    setPlaying(true);
  };

  const onStep = () => {
    if (busy || atEnd) return;
    setPlaying(false);
    void runStep(stepIndex + 1);
  };

  const occupiedCount = TABLE_IDS.filter((id) => world.tables[id].status === 'occupied').length;

  return (
    <div className="og-root not-content">
      <div className="og-tabs" role="group" aria-label="Scénarios">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="og-tab"
            aria-pressed={s.id === scenario.id}
            onClick={() => resetTo(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="og-controls">
        <button type="button" className="og-btn og-btn-primary" onClick={onPlay}>
          {playing ? 'Pause' : atEnd ? 'Rejouer' : 'Lecture'}
        </button>
        <button type="button" className="og-btn" onClick={onStep} disabled={busy || atEnd}>
          Étape suivante
        </button>
        <button type="button" className="og-btn" onClick={() => resetTo(scenario.id)}>
          Recommencer
        </button>
        <label className="og-speed">
          Vitesse
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            <option value={0.5}>0,5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>
        <span className="og-progress">
          Étape {shownStep} / {scenario.steps.length}
        </span>
      </div>

      <p className="og-narration" aria-live="polite">
        {narration}
      </p>

      <div className="og-svg-wrap">
      <svg
        className="og-svg"
        viewBox="0 0 800 500"
        role="img"
        aria-label="Plan du restaurant Ogodo : salle, cuisine et API. Les requêtes circulent entre le personnel et l'API."
      >
        {/* Cuisine */}
        <rect className="og-zone" x={30} y={20} width={490} height={100} rx={10} />
        <text className="og-zone-label" x={46} y={44}>
          Cuisine
        </text>
        <rect className="og-passe" x={232} y={110} width={76} height={18} rx={4} />
        <text className="og-small" x={270} y={106} textAnchor="middle">
          passe
        </text>
        {world.passePlate && <Plate x={270} y={119} />}

        {/* Écran cuisine */}
        <rect className="og-screen" x={330} y={30} width={178} height={78} rx={6} />
        <text className="og-small og-strong" x={342} y={47}>
          Écran cuisine
        </text>
        {world.tickets.length === 0 && (
          <text className="og-small og-muted" x={342} y={70}>
            aucune commande
          </text>
        )}
        {world.tickets.slice(0, 3).map((t, i) => (
          <g key={t.orderId} transform={`translate(342, ${64 + i * 18})`}>
            <text className="og-small" x={0} y={4}>
              Commande #{t.orderId} · table {t.tableId}
            </text>
          </g>
        ))}

        {/* Salle */}
        <rect className="og-zone og-floor" x={30} y={135} width={490} height={350} rx={10} />
        <text className="og-zone-label" x={46} y={159}>
          Salle
        </text>
        <rect className="og-station" x={414} y={440} width={98} height={34} rx={6} />
        <text className="og-small og-muted" x={463} y={434} textAnchor="middle">
          poste des serveurs
        </text>

        {TABLE_IDS.map((id) => (
          <TableView key={id} id={id} state={world.tables[id]} />
        ))}

        {/* API */}
        <rect className="og-api" x={570} y={160} width={205} height={190} rx={12} />
        <text className="og-api-title" x={672} y={190} textAnchor="middle">
          API Ogodo
        </text>
        <text className="og-small og-muted" x={672} y={208} textAnchor="middle">
          Express 5 · un seul service
        </text>
        <line className="og-sep" x1={590} y1={222} x2={755} y2={222} />
        <text className="og-small og-strong" x={590} y={244}>
          Dépôt en mémoire
        </text>
        <text className="og-small" x={590} y={266}>
          Tables occupées : {occupiedCount}
        </text>
        <text className="og-small" x={590} y={286}>
          Commandes enregistrées : {world.orderCount}
        </text>
        <text className="og-small" x={590} y={306}>
          En attente au passe : {world.passePlate ? 1 : 0}
        </text>

        {/* Légende */}
        <g transform="translate(578, 376)">
          <text className="og-small og-strong" x={0} y={0}>
            Requêtes (verbe + route)
          </text>
          {(['GET', 'POST', 'PUT'] as HttpMethod[]).map((m, i) => (
            <g key={m} transform={`translate(${i * 49}, 12)`}>
              <rect x={0} y={0} width={45} height={15} rx={7.5} fill={METHOD_COLOR[m]} />
              <text className="og-legend-text" x={22.5} y={11} textAnchor="middle">
                {m}
              </text>
            </g>
          ))}
          <text className="og-small og-strong" x={0} y={50}>
            Réponses (code de statut)
          </text>
          <rect x={0} y={60} width={45} height={15} rx={7.5} fill={statusColor(200)} />
          <text className="og-legend-text" x={22.5} y={71} textAnchor="middle">
            2xx
          </text>
          <text className="og-small" x={52} y={72}>
            succès
          </text>
          <rect x={98} y={60} width={45} height={15} rx={7.5} fill={statusColor(400)} />
          <text className="og-legend-text" x={120.5} y={71} textAnchor="middle">
            4xx
          </text>
          <text className="og-small" x={150} y={72}>
            refus
          </text>
        </g>

        {/* Personnel */}
        {(Object.keys(ACTORS) as ActorId[]).map((id) => (
          <ActorView
            key={id}
            id={id}
            pos={world.actors[id]}
            ms={moveMs[id]}
            carrying={world.carrying[id]}
            badge={badge && badge.actor === id ? badge.status : null}
          />
        ))}

        {/* Requête ou réponse en vol */}
        {packet && <PacketView packet={packet} />}
      </svg>
      </div>

      <div className="og-log">
        <div className="og-log-head">
          <span>Journal des requêtes</span>
          <span className="og-muted">{log.length === 0 ? 'vide' : `${log.length} échange(s), le plus récent en haut`}</span>
        </div>
        <ol className="og-log-list">
          {log.map((e) => (
            <li key={e.id}>
              <details>
                <summary>
                  <span className="og-method" style={{ background: METHOD_COLOR[e.method] }}>
                    {e.method}
                  </span>
                  <code className="og-path">{e.path}</code>
                  <span className="og-status" style={{ background: statusColor(e.status) }}>
                    {e.status}
                  </span>
                  <span className="og-who">{ACTORS[e.actor].name}</span>
                </summary>
                <div className="og-detail">
                  <div>
                    <div className="og-detail-title">Requête</div>
                    <pre>
                      {`${e.method} ${e.path}\n`}
                      {Object.entries(e.headers)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n')}
                      {e.requestBody !== undefined ? `\n\n${JSON.stringify(e.requestBody, null, 2)}` : ''}
                    </pre>
                  </div>
                  <div>
                    <div className="og-detail-title">
                      Réponse {e.status} {STATUS_TEXT[e.status] ?? ''}
                    </div>
                    <pre>{e.responseBody !== undefined ? JSON.stringify(e.responseBody, null, 2) : '(corps vide)'}</pre>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sous-composants SVG                                                 */
/* ------------------------------------------------------------------ */

function Plate({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} className="og-plate">
      <ellipse cx={-7} cy={0} rx={7} ry={4.5} />
      <ellipse cx={7} cy={0} rx={7} ry={4.5} />
    </g>
  );
}

function TableView({ id, state }: { id: TableId; state: TableState }) {
  const c = TABLES[id];
  const chairs = [45, 135, 225, 315].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: c.x + Math.cos(rad) * 46, y: c.y + Math.sin(rad) * 46 };
  });
  const occupiedBy = state.serverId ? ACTORS[state.serverId] : null;
  const seated = state.status === 'occupied' ? state.guests : 0;
  const pillLabel = state.orderId !== null ? `#${state.orderId}` : '';
  const pillWidth = pillLabel.length * 5.6 + 12;

  return (
    <g>
      {chairs.map((p, i) => {
        const cls = i < seated ? 'og-chair og-guest' : i < state.waiting ? 'og-chair og-waiting' : 'og-chair';
        return <circle key={i} className={cls} cx={p.x} cy={p.y} r={8} />;
      })}
      <circle
        className="og-table"
        cx={c.x}
        cy={c.y}
        r={32}
        style={occupiedBy ? { stroke: occupiedBy.color, strokeWidth: 3 } : undefined}
      />
      <text className="og-table-label" x={c.x} y={c.y - 6} textAnchor="middle">
        T{id}
      </text>
      {state.orderId !== null && (
        <g>
          <rect
            className="og-pill og-pill-order"
            x={c.x - pillWidth / 2}
            y={c.y + 3}
            width={pillWidth}
            height={14}
            rx={7}
          />
          <text className="og-pill-text" x={c.x} y={c.y + 13.5} textAnchor="middle">
            {pillLabel}
          </text>
        </g>
      )}
      {state.plate && <Plate x={c.x} y={c.y - 22} />}
    </g>
  );
}

function ActorView({
  id,
  pos,
  ms,
  carrying,
  badge,
}: {
  id: ActorId;
  pos: Point;
  ms: number;
  carrying: boolean;
  badge: number | null;
}) {
  const info = ACTORS[id];
  return (
    <g
      className="og-actor"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: `transform ${ms}ms ease-in-out`,
      }}
    >
      <circle r={13} fill={info.color} className="og-actor-dot" />
      <text className="og-actor-initial" y={4.5} textAnchor="middle">
        {info.name[0]}
      </text>
      <text className="og-actor-name" y={27} textAnchor="middle">
        {info.name}
      </text>
      {carrying && <Plate x={18} y={-12} />}
      {badge !== null && (
        <g transform="translate(14, -26)">
          <rect x={0} y={-9} width={34} height={17} rx={8.5} fill={statusColor(badge)} />
          <text className="og-badge-text" x={17} y={4} textAnchor="middle">
            {badge}
          </text>
        </g>
      )}
    </g>
  );
}

function PacketView({ packet }: { packet: Packet }) {
  const width = packet.label.length * 6.7 + 18;
  return (
    <g
      className="og-packet"
      style={{
        transform: `translate(${packet.at.x}px, ${packet.at.y}px)`,
        transition: `transform ${packet.ms}ms ease-in-out`,
      }}
    >
      <rect x={-width / 2} y={-11} width={width} height={22} rx={11} fill={packet.color} />
      <text className="og-packet-text" y={4} textAnchor="middle">
        {packet.label}
      </text>
    </g>
  );
}