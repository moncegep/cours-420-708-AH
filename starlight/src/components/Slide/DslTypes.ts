export type VisualNode =
  | BoxNode
  | StackNode
  | RowNode
  | SplitNode
  | LabeledStackNode;

export interface BoxNode {
  type: 'box';
  text: string;
  subtext?: string;
  color: ColorKey;
  height?: number;
}

export interface StackNode {
  type: 'stack';
  gap?: number;
  items: VisualNode[];
}

export interface RowNode {
  type: 'row';
  gap?: number;
  items: VisualNode[];
}

export interface SplitNode {
  type: 'split';
  separator?: string | false;
  left: VisualNode;
  right: VisualNode;
}

export interface LabeledStackNode {
  type: 'labeled-stack';
  label: string;
  labelColor: ColorKey;
  gap?: number;
  items: VisualNode[];
}

export type ColorKey = 'blue' | 'green' | 'amber' | 'purple' | 'surface' | 'transparent';