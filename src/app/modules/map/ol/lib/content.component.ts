import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'ol-map > ol-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  standalone: false
})
export class ContentComponent {
  protected elementRef = inject(ElementRef);

  constructor() {}
}
