/** Resource Dialog Components **
 ********************************/

import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  FbButtonComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbIconComponent,
  FbToolbarComponent
} from 'src/app/design-system/primitives';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA
} from '@angular/material/bottom-sheet';
import { AppFacade } from 'src/app/app.facade';
import type { SKResourceSet } from '../../custom-resource-classes';

interface ResourceSetFeatureProperties {
  name: string;
  description: string;
  'resourceset.name': string;
  'resourceset.description': string;
  'resourceset.collection': string;
}

/********* ResourceSetFeatureModal **********
 * Displays information about a ResourceSet feature
	data: {
    id: string
    item: SKResourceSet;
  }
***********************************/
@Component({
  selector: 'ap-resourceset-feature-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTooltipModule,
    FbButtonComponent,
    FbCardComponent,
    FbCardContentComponent,
    FbIconComponent,
    FbToolbarComponent
  ],
  template: `
    <div class="_ap-resource-set-feature">
      <fb-toolbar class="bg-transparent">
        <span fbToolbarTitle>
          {{ title }}
        </span>
        <span fbToolbarActions>
          <fb-button
            variant="ghost"
            ariaLabel="Close"
            (pressed)="closeModal()"
            matTooltip="Close"
            matTooltipPosition="left"
          >
            <fb-icon name="keyboard_arrow_down" ariaLabel=""></fb-icon>
          </fb-button>
        </span>
      </fb-toolbar>

      <fb-card>
        <fb-card-content>
          <div class="flex pb-xs">
            <div class="bold-top">Name:</div>
            <div class="pl-md">
              {{ properties.name }}
            </div>
          </div>
          <div class="bold-top">Description:</div>
          <div style="overflow-y: auto; height: 60px" target="notelink">
            {{ properties.description }}
          </div>
          <div class="flex pb-xs">
            <div class="bold-top">Resource Set:</div>
            <div class="pl-md">
              {{ properties['resourceset.name'] }}
            </div>
          </div>
          <div class="flex pb-xs">
            <div class="bold-top">Collection:</div>
            <div class="pl-md">
              {{ properties['resourceset.collection'] }}
            </div>
          </div>
        </fb-card-content>
      </fb-card>
    </div>
  `,
  styles: [
    `
      ._ap-resource-set-feature {
        font-family: arial;
        min-width: 300px;
      }
      ._ap-resource-set-feature .key-label {
        font-weight: 500;
      }
      ._ap-resource-set-feature .key-desc {
        font-style: italic;
      }
    `
  ]
})
export class ResourceSetFeatureModal implements OnInit {
  protected properties: ResourceSetFeatureProperties = {
    name: '',
    description: '',
    'resourceset.name': '',
    'resourceset.description': '',
    'resourceset.collection': ''
  };
  protected title = 'ResourceSet Feature: ';

  constructor(
    public app: AppFacade,
    public modalRef: MatBottomSheetRef<ResourceSetFeatureModal>,
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: {
      id: string;
      item: SKResourceSet;
    }
  ) {}

  ngOnInit() {
    this.parse();
  }

  closeModal() {
    this.modalRef.dismiss();
  }

  parse() {
    const t = this.data.id.split('.');
    const fIndex = Number(t[t.length - 1]);
    const features = this.data.item.values.features;
    if (!features || features.length === 0) {
      return;
    }
    const feature = fIndex < features.length ? features[fIndex]! : features[0]!;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = (feature.properties ?? {}) as Record<string, any>;

    this.title = (props['name'] as string) ?? 'Feature';
    this.properties = {
      name: (props['name'] as string) ?? '',
      description: (props['description'] as string) ?? '',
      'resourceset.name': this.data.item.name,
      'resourceset.description': this.data.item.description,
      'resourceset.collection': t[1] ?? ''
    };
  }
}
