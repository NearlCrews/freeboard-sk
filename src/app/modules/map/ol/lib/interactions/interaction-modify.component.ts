import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  output,
  Input,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { Map, Feature, Collection, MapBrowserEvent } from 'ol';
import { Geometry } from 'ol/geom';
import { Modify } from 'ol/interaction';
import { ModifyEvent } from 'ol/interaction/Modify';
import { MapComponent } from '../map.component';

@Component({
  selector: 'ol-map > ol-modify',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class InteractionModifyComponent implements AfterViewInit, OnDestroy {
  constructor(
    protected changeDetectorRef: ChangeDetectorRef,
    protected mapComponent: MapComponent
  ) {
    this.changeDetectorRef.detach();
  }

  @Input() features?: Collection<Feature<Geometry>>;

  readonly change = output<ModifyEvent>();
  readonly modifyStart = output<ModifyEvent>();
  readonly modifyEnd = output<ModifyEvent>();

  private map: Map | null = null;
  private interaction: Modify | null = null;

  ngAfterViewInit() {
    this.map = this.mapComponent.getMap();
    this.addModifyInteraction();
  }

  ngOnDestroy() {
    if (this.map && this.interaction) {
      this.map.removeInteraction(this.interaction);
      (this.interaction.un as (k: 'change', h: unknown) => void)(
        'change',
        this.emitChangeEvent
      );
      this.interaction.un('modifystart', this.emitModifyStartEvent);
      this.interaction.un('modifyend', this.emitModifyEndEvent);
      this.interaction = null;
    }
  }

  addModifyInteraction() {
    const map = this.map;
    if (map && this.features) {
      const interaction = new Modify({
        features: this.features,
        deleteCondition: (e: MapBrowserEvent) =>
          (e.type === 'click' && (e.originalEvent as PointerEvent).ctrlKey) ||
          e.type === 'contextmenu'
      });
      this.interaction = interaction;
      (interaction.on as (k: 'change', h: unknown) => void)(
        'change',
        this.emitChangeEvent
      );
      interaction.on('modifystart', this.emitModifyStartEvent);
      interaction.on('modifyend', this.emitModifyEndEvent);
      map.addInteraction(interaction);
      this.changeDetectorRef.detectChanges();
    }
  }

  // ** emit events

  private emitChangeEvent = (event: ModifyEvent) => this.change.emit(event);
  private emitModifyStartEvent = (event: ModifyEvent) =>
    this.modifyStart.emit(event);
  private emitModifyEndEvent = (event: ModifyEvent) =>
    this.modifyEnd.emit(event);
}
