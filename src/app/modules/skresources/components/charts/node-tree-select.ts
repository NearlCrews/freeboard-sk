import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';

import {
  FbTreeSelectComponent,
  type FbTreeNode
} from 'src/app/design-system/primitives/tree/tree.component';
import { LayerNode } from './maplib';

/**
 * Adapter from the LayerNode mutable model used by the WMS/WMTS plumbing
 * to the immutable `FbTreeNode` shape consumed by `fb-tree-select`. We
 * keep the LayerNode in `data` so leaf-id matching back to the original
 * graph stays trivial.
 */
function toFbNode(layer: LayerNode): FbTreeNode<LayerNode> {
  const node: {
    -readonly [K in keyof FbTreeNode<LayerNode>]: FbTreeNode<LayerNode>[K];
  } = {
    id: layer.name,
    label: layer.title ?? layer.name,
    data: layer
  };
  if (layer.children && layer.children.length > 0) {
    node.children = layer.children.map((c) => toFbNode(c));
  }
  return node;
}

function collectLeafIds(layer: LayerNode, out: string[]): void {
  if (Array.isArray(layer.children) && layer.children.length > 0) {
    for (const c of layer.children) collectLeafIds(c, out);
  } else {
    out.push(layer.name);
  }
}

/**
 * Map the user's row-level selection back into the LayerNode graph so any
 * code that still inspects `layer.selected` directly stays in sync, then
 * emit the flat list of selected LEAF names which is what existing
 * consumers (wms-dialog, chart-properties-dialog) expect.
 */
function syncSelectionToLayers(
  selected: ReadonlySet<string>,
  layers: readonly LayerNode[]
): string[] {
  const out: string[] = [];
  const walk = (layer: LayerNode): void => {
    const isLeaf =
      !Array.isArray(layer.children) || layer.children.length === 0;
    layer.selected = selected.has(layer.name);
    if (isLeaf) {
      if (layer.selected) out.push(layer.name);
    } else if (layer.children) {
      for (const c of layer.children) walk(c);
    }
  };
  for (const root of layers) walk(root);
  return out;
}

/**
 * NodeTreeSelect rebuilt on top of `fb-tree-select`.
 *
 * The public API (`preSelect`, `layers`, `expand` inputs and `selected`
 * output) is preserved so wms-dialog and chart-properties-dialog do not
 * need template changes. Cascade is enabled because legacy behavior was to
 * toggle a parent and have it propagate through descendants.
 */
@Component({
  selector: 'node-tree-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbTreeSelectComponent],
  template: `
    <fb-tree-select
      class="node-tree-select"
      [nodes]="treeNodes()"
      [defaultExpanded]="expand()"
      [cascade]="true"
      [(selected)]="selectedIds"
      ariaLabel="Layer tree"
    ></fb-tree-select>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .node-tree-select {
        background: transparent;
      }
    `
  ]
})
export class NodeTreeSelect {
  readonly selected = output<string[]>();
  protected preSelect = input<string[]>([]);
  protected layers = input<LayerNode[]>([]);
  protected expand = input<boolean>(false);

  protected readonly selectedIds = signal<readonly string[]>([]);

  protected readonly treeNodes = computed<readonly FbTreeNode<LayerNode>[]>(
    () => this.layers().map((l) => toFbNode(l))
  );

  private emittedInitial = false;

  constructor() {
    effect(() => {
      const pre = this.preSelect();
      const layers = this.layers();
      if (!Array.isArray(pre) || pre.length === 0 || layers.length === 0)
        return;
      const preSet = new Set(pre);
      const leaves: string[] = [];
      for (const l of layers) collectLeafIds(l, leaves);
      const next = leaves.filter((id) => preSet.has(id));
      if (next.length === 0) return;
      this.selectedIds.set(next);
    });

    effect(() => {
      const ids = new Set(this.selectedIds());
      const leafSelections = syncSelectionToLayers(ids, this.layers());
      if (!this.emittedInitial && leafSelections.length === 0) {
        this.emittedInitial = true;
        return;
      }
      this.emittedInitial = true;
      this.selected.emit(leafSelections);
    });
  }
}
