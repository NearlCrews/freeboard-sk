import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';

import { AppFacade } from 'src/app/app.facade';

import {
  FbListComponent,
  FbListItemComponent
} from 'src/app/design-system/primitives';

/********* NodeList Select ***********/
@Component({
  selector: 'node-list-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbListComponent, FbListItemComponent],
  template: `
    <div class="_ap-node-list">
      <div>
        <fb-list density="compact">
          @for (layer of layers(); track layer.name) {
            <fb-list-item
              interactive
              [selected]="activeId() === layer.id"
              (activated)="selectLayer(layer.id)"
            >
              {{ layer.name }}
              <span fbListItemSubtext>{{ layer.description }}</span>
            </fb-list-item>
          }
        </fb-list>
      </div>
    </div>
  `,
  styles: [
    `
      ._ap-node-list {
      }
      ._ap-node-list .key-label {
        width: 150px;
        font-weight: 500;
      }
    `
  ]
})
export class NodeListSelect {
  readonly selected = output<string[]>();
  protected preSelect = input<string[]>([]);
  protected layers = input<{ id: string; name: string; description: string }[]>(
    []
  );

  private readonly selectedId = signal<string | null>(null);
  protected readonly activeId = computed<string | null>(
    () => this.selectedId() ?? this.preSelect()[0] ?? null
  );

  protected app = inject(AppFacade);

  constructor() {}

  /**
   * Handle list item activation; emits the single selected layer id.
   */
  protected selectLayer(id: string) {
    this.selectedId.set(id);
    this.selected.emit([id]);
  }
}
