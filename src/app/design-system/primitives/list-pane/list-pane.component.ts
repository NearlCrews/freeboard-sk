import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChild,
  input,
  output
} from '@angular/core';
import { CdkListbox, CdkOption } from '@angular/cdk/listbox';
import { NgTemplateOutlet } from '@angular/common';

export interface FbListPaneItem {
  readonly id: string;
  readonly label: string;
}

/**
 * Tier-2 primitive: navigation pane in a 3-pane (list/detail/inspector)
 * layout. The pane wraps `[cdkListbox]` + `[cdkOption]` for accessible
 * single-selection with arrow-key roving focus, typeahead, and Home/End
 * navigation, and emits `selectionChange` with the selected id.
 *
 * Slots:
 *   <ng-template fbListPaneHeader>...</ng-template>   pinned top
 *   <ng-template fbListPaneItem let-item>...</ng-template>  per-row content
 *   <ng-template fbListPaneFooter>...</ng-template>   pinned bottom
 *
 * When `fbListPaneItem` is omitted the component falls back to rendering
 * `item.label` so consumers can mount the pane with one input.
 */
@Component({
  selector: 'fb-list-pane',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkListbox, CdkOption, NgTemplateOutlet],
  host: { role: 'navigation' },
  template: `
    @if (headerTpl()) {
      <header class="fb-list-pane__header">
        <ng-container [ngTemplateOutlet]="headerTpl()!"></ng-container>
      </header>
    }
    <ul
      class="fb-list-pane__list"
      cdkListbox
      [cdkListboxValue]="selectedValue()"
      (cdkListboxValueChange)="onValueChange($event.value)"
    >
      @for (item of items(); track item.id) {
        <li
          class="fb-list-pane__item"
          [cdkOption]="item.id"
          [attr.data-selected]="item.id === selected() ? '' : null"
        >
          @if (itemTpl()) {
            <ng-container
              [ngTemplateOutlet]="itemTpl()!"
              [ngTemplateOutletContext]="{ $implicit: item }"
            ></ng-container>
          } @else {
            <span class="fb-list-pane__label">{{ item.label }}</span>
          }
        </li>
      }
    </ul>
    @if (footerTpl()) {
      <footer class="fb-list-pane__footer">
        <ng-container [ngTemplateOutlet]="footerTpl()!"></ng-container>
      </footer>
    }
  `,
  styleUrls: ['./list-pane.component.scss']
})
export class FbListPaneComponent {
  readonly items = input.required<readonly FbListPaneItem[]>();
  readonly selected = input<string | null>(null);

  readonly selectionChange = output<string>();

  readonly headerTpl = contentChild<TemplateRef<unknown>>('fbListPaneHeader');
  readonly itemTpl =
    contentChild<TemplateRef<{ $implicit: FbListPaneItem }>>('fbListPaneItem');
  readonly footerTpl = contentChild<TemplateRef<unknown>>('fbListPaneFooter');

  readonly selectedValue = computed<readonly string[]>(() => {
    const value = this.selected();
    return value === null ? [] : [value];
  });

  onValueChange(value: readonly string[]): void {
    const next = value[0];
    if (next !== undefined) {
      this.selectionChange.emit(next);
    }
  }
}
