import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges,
  inject
} from '@angular/core';
import { Feature } from 'ol';
import { Style, RegularShape, Stroke, Fill, Text } from 'ol/style';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { MapComponent } from '../map.component';
import { FBFeatureLayerComponent } from '../sk-feature.component';
import { FBNotes, NoteResource } from 'src/app/types';
import { MapImageRegistry } from '../map-image-registry.service';
import { MapThemeService } from '../theme';
import { FEATURE_ID_PREFIX } from './feature-id-prefix';
import { SKNote } from 'src/app/modules/skresources';

// ** Open Binnacle resource collection format **
@Component({
  selector: 'ol-map > fb-notes',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class OpenBinnacleNoteLayerComponent extends FBFeatureLayerComponent {
  @Input() notes: FBNotes = [];

  private readonly mapTheme = inject(MapThemeService);

  constructor(
    protected override mapComponent: MapComponent,
    protected override changeDetectorRef: ChangeDetectorRef,
    protected mapImages: MapImageRegistry
  ) {
    super(mapComponent, changeDetectorRef);
  }

  override ngOnInit() {
    super.ngOnInit();
    this.labelPrefixes = [FEATURE_ID_PREFIX.notes];
    this.parseFBNotes(this.notes);
  }

  override ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    const notesChange = changes['notes'];
    if (this.source && notesChange) {
      this.source.clear();
      this.parseFBNotes(notesChange.currentValue);
    }
  }

  parseFBNotes(notes: FBNotes = this.notes) {
    const fa: Feature[] = [];
    // Snapshot the palette once per parse rather than reading the signal
    // through buildStyle() for every note.
    const noteColor = this.mapTheme.palette().note;
    for (const n of notes) {
      const note = n[1];
      if (!note.position) {
        continue;
      }
      const f = new Feature({
        geometry: new Point(
          fromLonLat([note.position.longitude, note.position.latitude])
        ),
        name: note.name
      });
      f.setId(`${FEATURE_ID_PREFIX.notes}.${n[0]}`);
      const skIcon = note.properties?.['skIcon'];
      f.set('icon', skIcon ? `sk-${skIcon}` : 'local_offer');
      f.setStyle(this.buildStyle(note, noteColor).clone());
      fa.push(f);
    }
    this.source.addFeatures(fa);
  }

  // build note feature style
  buildStyle(note: SKNote | NoteResource, noteColor?: string): Style {
    const skIcon = note.properties?.['skIcon'];
    const icon = this.mapImages.getPOI(
      typeof skIcon === 'string' ? skIcon : 'default'
    );
    if (icon) {
      return new Style({
        image: icon,
        text: new Text({ text: '', offsetX: 0, offsetY: -12 })
      });
    }
    return new Style({
      image: new RegularShape({
        points: 4,
        radius: 10,
        fill: new Fill({ color: noteColor ?? this.mapTheme.palette().note }),
        stroke: new Stroke({ color: 'black', width: 1 }),
        rotation: (Math.PI / 180) * 45
      })
    });
  }
}
