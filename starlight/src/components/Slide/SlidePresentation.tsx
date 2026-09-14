import { useState, useRef, useEffect, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import type { VisualNode } from './DslTypes';
import { renderVisual } from './VisualRenderer';

// =============================================================
// DATA TYPES
// =============================================================
export interface SlideAside {
  type: string;
  title?: string;
  text: string;
}

export interface SlideCard {
  type: string;
  label: string;
  text?: string;
  visual?: string;  // key into SlideData.visuals
}

export interface SlideComparison {
  headers: string[];
  rows: string[][];
}

export interface SlideSection {
  id: string;
  tag: string;
  title: string;
  nav: string;
  content: string;
  contentType?: 'comparison';
  comparison?: SlideComparison;
  extended?: string[];
  asides?: SlideAside[];
  cards?: SlideCard[];
}

export interface SlideData {
  title: string;
  visuals?: Record<string, VisualNode>;
  sections: SlideSection[];
}

// =============================================================
// MARKDOWN
// =============================================================
const mdComponents = {
  p: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  strong: ({ children }: { children?: ReactNode }) => <strong>{children}</strong>,
  em: ({ children }: { children?: ReactNode }) => <em>{children}</em>,
  code: ({ children, className }: { children?: ReactNode; className?: string }) => {
    if (className) {
      return <pre className="sl-pre"><code>{children}</code></pre>;
    }
    return <code>{children}</code>;
  },
  pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
  ol: ({ children }: { children?: ReactNode }) => <ol>{children}</ol>,
  ul: ({ children }: { children?: ReactNode }) => <ul>{children}</ul>,
  li: ({ children }: { children?: ReactNode }) => <li>{children}</li>,
};

function Md({ content }: { content: string }) {
  return <Markdown components={mdComponents}>{content}</Markdown>;
}

// =============================================================
// SUB-COMPONENTS
// =============================================================
function ComparisonTable({ data }: { data: SlideComparison }) {
  return (
    <table className="sl-table">
      <thead><tr>{data.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{data.rows.map((row, i) => (
        <tr key={i}>{row.map((cell, j) => (
          <td key={j} style={j === 0 ? { fontWeight: 600, opacity: 0.6 } : undefined}>{cell}</td>
        ))}</tr>
      ))}</tbody>
    </table>
  );
}

function AsideBlock({ type, title, text }: SlideAside) {
  const palette: Record<string, { accent: string; bg: string }> = {
    note:    { accent: 'var(--sl-color-blue-high, #2d5faa)',   bg: 'var(--sl-color-blue-low, #ebf0fa)' },
    tip:     { accent: 'var(--sl-color-green-high, #1d7a4e)',  bg: 'var(--sl-color-green-low, #e8f5ee)' },
    caution: { accent: 'var(--sl-color-orange-high, #a06b0a)', bg: 'var(--sl-color-orange-low, #fdf4e0)' },
    term:    { accent: 'var(--sl-color-purple-high, #6b3fa0)', bg: 'var(--sl-color-purple-low, #f3eefa)' },
  };
  const s = palette[type] || palette.note;
  return (
    <div style={{ borderLeft: `3px solid ${s.accent}`, background: s.bg, borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 10 }}>
      {title && <div style={{ fontSize: 12, fontWeight: 700, color: s.accent, marginBottom: 4 }}>{title}</div>}
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function CardBlock({ card, visuals }: { card: SlideCard; visuals?: Record<string, VisualNode> }) {
  const accents: Record<string, { bg: string; border: string }> = {
    concept: { bg: 'var(--sl-color-gray-6, #f4f3f0)', border: 'var(--sl-color-gray-5, #e0ded8)' },
    example: { bg: 'var(--sl-color-orange-low, #fdf4e0)', border: 'var(--sl-color-orange-high, #a06b0a)' },
    ref:     { bg: 'var(--sl-color-blue-low, #ebf0fa)',  border: 'var(--sl-color-blue-high, #2d5faa)' },
    visual:  { bg: 'var(--sl-color-gray-6, #f4f3f0)', border: 'var(--sl-color-gray-5, #e0ded8)' },
  };
  const a = accents[card.type] || accents.concept;

  const visualNode = card.visual && visuals?.[card.visual];

  return (
    <div style={{
      background: a.bg,
      marginTop: 0,
      border: `1px solid color-mix(in srgb, ${a.border} 15%, transparent)`,
      borderRadius: 10, padding: 14, minWidth: 175, maxWidth: 210, flex: '0 0 auto',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.5, marginBottom: 6 }}>
        {card.label}
      </div>
      {visualNode
        ? renderVisual(visualNode)
        : <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{card.text}</div>
      }
    </div>
  );
}

// Icons
function ChevLeft() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function ChevRight() { return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 4L12 9L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function PlusCircle() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/><line x1="8" y1="4.5" x2="8" y2="11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }
function MinusCircle() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>; }

// =============================================================
// MAIN COMPONENT
// =============================================================
export default function SlidePresentation({ data }: { data: SlideData }) {
  const { sections, visuals } = data;
  const [idx, setIdx] = useState(0);
  const [animDir, setAnimDir] = useState(0);
  const [depth, setDepth] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sec = sections[idx];
  const total = sections.length;
  const maxDepth = sec.extended?.length || 0;

  const go = (i: number) => {
    if (i < 0 || i >= total) return;
    setAnimDir(i > idx ? 1 : -1);
    setIdx(i);
    setDepth(0);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [idx]);

  useEffect(() => {
    if (cardRef.current) cardRef.current.scrollLeft = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [idx]);

  const prev = idx > 0 ? sections[idx - 1] : null;
  const next = idx < total - 1 ? sections[idx + 1] : null;

  return (
    <div className="sl-slides" style={{
      height: 'calc(100vh - 4rem)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      borderRadius: 12,
      border: '1px solid var(--sl-color-gray-5, #e0ded8)',
      background: 'var(--sl-color-bg, white)',
    }}>
      <style>{`
        .sl-slides { font-family: var(--sl-font, system-ui, sans-serif); color: var(--sl-color-text, #1a1a2e); }
        .sl-slides p { font-size: 15px; line-height: 1.75; margin-bottom: 10px; }
        .sl-slides p:last-child { margin-bottom: 0; }
        .sl-slides strong { font-weight: 600; }
        .sl-slides ol, .sl-slides ul { padding-left: 20px; margin: 8px 0; }
        .sl-slides li { margin-bottom: 4px; font-size: 15px; line-height: 1.7; }
        .sl-slides code { font-family: var(--sl-font-mono, monospace); font-size: 13px; background: var(--sl-color-gray-6, rgba(0,0,0,0.05)); padding: 1px 5px; border-radius: 4px; }
        .sl-slides .sl-pre { background: var(--sl-color-gray-1, #1a1a2e); color: var(--sl-color-gray-6, #c8c8d8); padding: 12px 16px; border-radius: 8px; font-family: var(--sl-font-mono, monospace); font-size: 12.5px; line-height: 1.6; overflow-x: auto; margin: 12px 0; white-space: pre; }
        .sl-slides .sl-pre code { background: none; padding: 0; font-size: inherit; color: inherit; }
        .sl-slides .sl-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .sl-slides .sl-table th { text-align: left; padding: 10px 12px; font-weight: 600; border-bottom: 2px solid var(--sl-color-gray-5, #e0ded8); }
        .sl-slides .sl-table td { padding: 8px 12px; border-bottom: 1px solid var(--sl-color-gray-5, #e0ded8); }
        .sl-slides .scroll-z { scrollbar-width: thin; }
        .sl-slides .scroll-z::-webkit-scrollbar { width: 4px; }
        .sl-slides .scroll-z::-webkit-scrollbar-thumb { background: var(--sl-color-gray-5, #ccc); border-radius: 2px; }
        .sl-slides .cards-z { overflow-x: auto; scrollbar-width: thin; }
        .sl-slides .cards-z::-webkit-scrollbar { height: 4px; }
        .sl-slides .cards-z::-webkit-scrollbar-thumb { background: var(--sl-color-gray-5, #ccc); border-radius: 2px; }
        .sl-slides .nb { display: flex; align-items: center; gap: 8px; border: none; background: none; cursor: pointer; padding: 6px 0; transition: opacity 0.2s; font-family: inherit; color: inherit; }
        .sl-slides .nb:hover { opacity: 0.6; }
        .sl-slides .nb:disabled { opacity: 0.15; cursor: default; }
        .sl-slides .db { display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--sl-color-gray-5, #e0ded8); background: var(--sl-color-bg, white); cursor: pointer; padding: 5px 14px; border-radius: 20px; font-family: inherit; font-size: 13px; color: var(--sl-color-gray-3, #6b6b80); transition: all 0.2s; }
        .sl-slides .db:hover { border-color: var(--sl-color-blue-high, #2d5faa); color: var(--sl-color-blue-high, #2d5faa); background: var(--sl-color-blue-low, #ebf0fa); }
        @keyframes sl-slideIn { from { opacity: 0; transform: translateX(calc(var(--dir) * 24px)); } to { opacity: 1; transform: translateX(0); } }
        @keyframes sl-fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--sl-color-gray-5, #e0ded8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.5 }}>{sec.tag}</div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {sections.map((s, i) => (
            <button key={s.id} onClick={() => go(i)} title={s.title} style={{
              width: i === idx ? 20 : 7, height: 7, borderRadius: 4,
              background: i === idx ? 'var(--sl-color-accent, #2d5faa)' : 'var(--sl-color-gray-5, #e0ded8)',
              border: 'none', cursor: 'pointer', transition: 'all 0.3s',
            }} />
          ))}
          <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 6 }}>{idx + 1}/{total}</span>
        </div>
      </div>

      {/* MAIN */}
      <div key={`${idx}-${animDir}`} style={{
        flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0,
        animation: 'sl-slideIn 0.3s ease', ['--dir' as string]: animDir,
      }}>
        {/* ZONE A */}
        <div style={{ flex: 1, padding: '28px 32px 16px', borderRight: sec.asides?.length ? '1px solid var(--sl-color-gray-5, #e0ded8)' : 'none', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginBottom: 18, flexShrink: 0 }}>{sec.title}</h2>

          <div ref={scrollRef} className="scroll-z" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
            {sec.contentType === 'comparison' && sec.comparison && <ComparisonTable data={sec.comparison} />}
            <Md content={sec.content} />

            {sec.extended?.map((ext, i) => i < depth ? (
              <div key={i} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--sl-color-gray-5, #e0ded8)', animation: 'sl-fadeUp 0.3s ease' }}>
                <Md content={ext} />
              </div>
            ) : null)}

            {maxDepth > 0 && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                {depth < maxDepth && (
                  <button className="db" onClick={() => setDepth(d => d + 1)}>
                    <PlusCircle /> En savoir plus
                    <span style={{ fontSize: 11, opacity: 0.4 }}>{depth + 1}/{maxDepth}</span>
                  </button>
                )}
                {depth > 0 && (
                  <button className="db" onClick={() => setDepth(0)} style={{ fontSize: 12 }}>
                    <MinusCircle /> Réduire
                  </button>
                )}
              </div>
            )}
          </div>

          {/* NAV */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--sl-color-gray-5, #e0ded8)', flexShrink: 0 }}>
            <button className="nb" disabled={!prev} onClick={() => go(idx - 1)} style={{ minWidth: 110 }}>
              <ChevLeft />
              {prev && <span style={{ fontSize: 13, opacity: 0.5 }}>{prev.nav}</span>}
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              {sections.map((s, i) => (
                <button key={s.id} onClick={() => go(i)} style={{ marginTop: 0, width: 5, height: 5, borderRadius: 3, background: i <= idx ? 'var(--sl-color-accent, #2d5faa)' : 'var(--sl-color-gray-5, #e0ded8)', border: 'none', cursor: 'pointer', opacity: i < idx ? 0.35 : 1 }} />
              ))}
            </div>
            <button className="nb" disabled={!next} onClick={() => go(idx + 1)} style={{ minWidth: 110, justifyContent: 'flex-end' }}>
              {next && <span style={{ fontSize: 13, opacity: 0.5 }}>{next.nav}</span>}
              <ChevRight />
            </button>
          </div>
        </div>

        {/* ZONE B */}
        {sec.asides && sec.asides.length > 0 && (
          <div className="scroll-z" style={{ width: 220, padding: '28px 14px 20px', background: 'var(--sl-color-gray-6, #f4f3f0)', overflowY: 'auto', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.35, marginBottom: 12 }}>Notes</div>
            {sec.asides.map((a, i) => <AsideBlock key={i} {...a} />)}
          </div>
        )}
      </div>

      {/* ZONE C */}
      {sec.cards && sec.cards.length > 0 && (
        <div style={{ borderTop: '1px solid var(--sl-color-gray-5, #e0ded8)', padding: '12px 20px', background: 'var(--sl-color-gray-6, #f4f3f0)', flexShrink: 0 }}>
          <div ref={cardRef} className="cards-z" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {sec.cards.map((c, i) => <CardBlock key={`${idx}-${i}`} card={c} visuals={visuals} />)}
          </div>
        </div>
      )}
    </div>
  );
}
