import { Directive, HostBinding, input } from '@angular/core';

export type FbDialogActionsAlign = 'start' | 'center' | 'end';

@Directive({
  selector: '[fbDialogTitle]',
  standalone: true,
  host: { class: 'fb-dialog-title' }
})
export class FbDialogTitleDirective {}

@Directive({
  selector: '[fbDialogContent]',
  standalone: true,
  host: { class: 'fb-dialog-content' }
})
export class FbDialogContentDirective {}

@Directive({
  selector: '[fbDialogActions]',
  standalone: true,
  host: { class: 'fb-dialog-actions' }
})
export class FbDialogActionsDirective {
  readonly align = input<FbDialogActionsAlign>('end');

  @HostBinding('attr.data-align') get alignAttr(): string {
    return this.align();
  }
}
