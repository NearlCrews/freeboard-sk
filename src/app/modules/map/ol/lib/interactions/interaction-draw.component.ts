import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  output,
  Input,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { Map } from 'ol';
import { Draw } from 'ol/interaction';
import { DrawEvent } from 'ol/interaction/Draw';
import { Style } from 'ol/style';
import { MapComponent } from '../map.component';

@Component({
  selector: 'ol-map > ol-draw',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class InteractionDrawComponent implements AfterViewInit, OnDestroy {
  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input() type = 'LineString';
  @Input() style?: Style;
  @Input() stopClick?: boolean;

  readonly change = output<DrawEvent>();
  readonly drawStart = output<DrawEvent>();
  readonly drawEnd = output<DrawEvent>();
  readonly drawAbort = output<DrawEvent>();

  private map: Map | null = null;
  private interaction: Draw | null = null;

  ngAfterViewInit() {
    this.map = this.mapComponent.getMap();
    this.addDrawInteraction();
  }

  ngOnDestroy() {
    if (this.map && this.interaction) {
      this.map.removeInteraction(this.interaction);
      (this.interaction.un as (k: 'change', h: unknown) => void)(
        'change',
        this.emitChangeEvent
      );
      this.interaction.un('drawstart', this.emitDrawStartEvent);
      this.interaction.un('drawend', this.emitDrawEndEvent);
      this.interaction.un('drawabort', this.emitDrawAbortEvent);
      this.interaction = null;
    }
  }

  addDrawInteraction() {
    const map = this.map;
    if (map) {
      const interaction = new Draw({
        type: this.type as 'Point' | 'LineString' | 'Polygon' | 'Circle',
        stopClick: this.stopClick ?? true,
        ...(this.style ? { style: this.style } : {})
      });
      this.interaction = interaction;
      (interaction.on as (k: 'change', h: unknown) => void)(
        'change',
        this.emitChangeEvent
      );
      interaction.on('drawstart', this.emitDrawStartEvent);
      interaction.on('drawend', this.emitDrawEndEvent);
      interaction.on('drawabort', this.emitDrawAbortEvent);
      map.addInteraction(interaction);
      this.changeDetectorRef.detectChanges();
    }
  }

  // ** emit events
  private emitChangeEvent = (event: DrawEvent) => this.change.emit(event);
  private emitDrawStartEvent = (event: DrawEvent) => this.drawStart.emit(event);
  private emitDrawEndEvent = (event: DrawEvent) => this.drawEnd.emit(event);
  private emitDrawAbortEvent = (event: DrawEvent) => this.drawAbort.emit(event);
}
