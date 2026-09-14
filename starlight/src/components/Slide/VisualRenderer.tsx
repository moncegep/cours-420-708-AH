import type { ReactNode } from 'react';
import type { ColorKey, VisualNode, BoxNode, StackNode, RowNode, SplitNode, LabeledStackNode } from './DslTypes'

// =============================================================
// VISUAL DSL TYPES
// =============================================================


// =============================================================
// COLOR RESOLUTION
// =============================================================
const COLOR_MAP: Record<ColorKey, { bg: string; text: string }> = {
  blue:        { bg: 'var(--sl-color-blue-low, #ebf0fa)',   text: 'var(--sl-color-blue-high, #2d5faa)' },
  green:       { bg: 'var(--sl-color-green-low, #e8f5ee)',  text: 'var(--sl-color-green-high, #1d7a4e)' },
  amber:       { bg: 'var(--sl-color-orange-low, #fdf4e0)', text: 'var(--sl-color-orange-high, #a06b0a)' },
  purple:      { bg: 'var(--sl-color-purple-low, #f3eefa)', text: 'var(--sl-color-purple-high, #6b3fa0)' },
  surface:     { bg: 'var(--sl-color-gray-6, #f4f3f0)',     text: 'var(--sl-color-text, #1a1a2e)' },
  transparent: { bg: 'transparent',                          text: 'transparent' },
};

function resolveColor(key: ColorKey) {
  return COLOR_MAP[key] || COLOR_MAP.surface;
}

// =============================================================
// RENDERER
// =============================================================
export function renderVisual(node: VisualNode): ReactNode {
  if (!node || !node.type) return null;

  // Infer type from shape when not explicitly set
  const typed = node.type ? node : inferType(node);
  if (!typed.type) return null;

  switch (node.type) {
    case 'box':
      return renderBox(node);
    case 'stack':
      return renderStack(node);
    case 'row':
      return renderRow(node);
    case 'split':
      return renderSplit(node);
    case 'labeled-stack':
      return renderLabeledStack(node);
    default:
      return null;
  }
}

function inferType(node: Record<string, unknown>): VisualNode {
  // { text, color } → box
  if ('text' in node && 'color' in node) {
    return { type: 'box', ...node } as BoxNode;
  }
  // { items } with label → labeled-stack, without → stack
  if ('items' in node && 'label' in node) {
    return { type: 'labeled-stack', ...node } as LabeledStackNode;
  }
  if ('items' in node) {
    return { type: 'stack', ...node } as StackNode;
  }
  // { left, right } → split
  if ('left' in node && 'right' in node) {
    return { type: 'split', ...node } as SplitNode;
  }
  
  return node as unknown as VisualNode;
}

function renderBox(node: BoxNode): ReactNode {
  const c = resolveColor(node.color);
  const hasLargeText = node.height && node.height > 50;

  if (hasLargeText) {
    // Prominent box with centered large text + subtext (for split panels)
    return (
      <div style={{
        background: c.bg,
        borderRadius: 8,
        height: node.height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        width: '100%',
      }}>
        {node.subtext && (
          <div style={{ fontSize: 10, fontWeight: 600, color: c.text }}>
            {node.subtext}
          </div>
        )}
        <div style={{ fontSize: 18, fontWeight: 700, color: c.text }}>
          {node.text}
        </div>
      </div>
    );
  }

  // Standard compact box (for stacks)
  return (
    <div style={{
      background: c.bg,
      borderRadius: 6,
      padding: '6px 10px',
      width: '100%',
      textAlign: 'center',
      fontSize: 11,
      fontWeight: 500,
    }}>
      {node.text}
    </div>
  );
}

function renderStack(node: StackNode): ReactNode {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: node.gap ?? 3,
      width: '100%',
    }}>
      {node.items.map((item, i) => (
        <div key={i}>{renderVisual(item)}</div>
      ))}
    </div>
  );
}

function renderRow(node: RowNode): ReactNode {
  return (
    <div style={{
      display: 'flex',
      gap: node.gap ?? 3,
      width: '100%',
    }}>
      {node.items.map((item, i) => (
        <div key={i} style={{ flex: 1 }}>{renderVisual(item)}</div>
      ))}
    </div>
  );
}

function renderSplit(node: SplitNode): ReactNode {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: node.separator ? 6 : 4,
      width: '100%',
    }}>
      <div style={{ flex: 1 }}>{renderVisual(node.left)}</div>
      {node.separator && (
        <div style={{ fontSize: 16, opacity: 0.4, flexShrink: 0 }}>
          {node.separator}
        </div>
      )}
      <div style={{ flex: 1 }}>{renderVisual(node.right)}</div>
    </div>
  );
}

function renderLabeledStack(node: LabeledStackNode): ReactNode {
  const c = resolveColor(node.labelColor);
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: c.text,
        marginBottom: 3,
      }}>
        {node.label}
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: node.gap ?? 2,
      }}>
        {node.items.map((item, i) => (
          <div key={i}>{renderVisual(item)}</div>
        ))}
      </div>
    </div>
  );
}
