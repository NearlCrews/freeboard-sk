import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { FbButtonComponent } from './primitives/button/button.component';
import { FbDialogComponent } from './primitives/dialog/dialog.component';
import { FbDialogService } from './primitives/dialog/dialog.service';
import { FbSheetComponent } from './primitives/sheet/sheet.component';
import { FbSheetService } from './primitives/sheet/sheet.service';
import { FbIconComponent } from './primitives/icon/icon.component';
import { FbFabComponent } from './primitives/fab/fab.component';
import { FbMenuService } from './primitives/menu/menu.service';
import type { FbMenuItem } from './primitives/menu/menu.component';
import { FbSnackbarService } from './primitives/snackbar/snackbar.service';
import { FbSidenavComponent } from './primitives/sidenav/sidenav.component';
import { FbSidenavService } from './primitives/sidenav/sidenav.service';
import { FbInputComponent } from './primitives/input/input.component';
import { FbTextareaComponent } from './primitives/textarea/textarea.component';
import {
  FbSelectComponent,
  FbSelectTriggerDirective
} from './primitives/select/select.component';
import type { FbSelectOption } from './primitives/select/select.component';
import { FbCheckboxComponent } from './primitives/checkbox/checkbox.component';
import { FbRadioComponent } from './primitives/radio/radio.component';
import { FbRadioGroupComponent } from './primitives/radio/radio-group.component';
import { FbSwitchComponent } from './primitives/switch/switch.component';
import { FbSliderComponent } from './primitives/slider/slider.component';
import { FbSegmentedComponent } from './primitives/segmented/segmented.component';
import type { FbSegmentedOption } from './primitives/segmented/segmented.component';
import {
  FbCardActionsComponent,
  FbCardComponent,
  FbCardContentComponent,
  FbCardHeaderComponent
} from './primitives/card/card.component';
import { FbDividerComponent } from './primitives/divider/divider.component';
import { FbHintComponent } from './primitives/hint/hint.component';
import { FbToolbarComponent } from './primitives/toolbar/toolbar.component';
import { FbProgressBarComponent } from './primitives/progress-bar/progress-bar.component';
import {
  FbListComponent,
  FbListItemComponent,
  FbNavListComponent,
  FbSelectionListComponent
} from './primitives/list/list.component';
import type { FbSelectionListOption } from './primitives/list/list.component';
import {
  FbTabPanelDirective,
  FbTabsComponent
} from './primitives/tabs/tabs.component';
import type { FbTabDef } from './primitives/tabs/tabs.component';
import {
  FbAccordionComponent,
  FbExpansionPanelComponent,
  FbExpansionPanelDescriptionDirective,
  FbExpansionPanelIconDirective,
  FbExpansionPanelTitleDirective
} from './primitives/expansion-panel/expansion-panel.component';
import {
  FbStepActionsDirective,
  FbStepComponent,
  FbStepperComponent
} from './primitives/stepper/stepper.component';
import { FbDatepickerComponent } from './primitives/datepicker/datepicker.component';

type Theme = 'light' | 'dark' | 'night-red';

/**
 * Demo dialog body for the showcase. Standalone component so the CDK
 * Dialog service can portal it into the overlay container.
 */
@Component({
  selector: 'fb-demo-dialog-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbDialogComponent, FbButtonComponent],
  template: `
    <fb-dialog labelId="demo-dialog-title" descriptionId="demo-dialog-body">
      <span fbDialogHeader id="demo-dialog-title">Confirm change</span>
      <p fbDialogBody id="demo-dialog-body">
        This is a CDK Dialog rendered with token-driven chrome. Escape closes
        it, Tab cycles inside, and focus restores to the trigger on dismiss.
      </p>
      <ng-container fbDialogFooter>
        <fb-button variant="ghost" size="md" (pressed)="close('cancel')">
          Cancel
        </fb-button>
        <fb-button variant="primary" size="md" (pressed)="close('ok')">
          OK
        </fb-button>
      </ng-container>
    </fb-dialog>
  `
})
export class FbDemoDialogBodyComponent {
  private readonly ref = inject(DialogRef) as DialogRef<string>;
  close(value: string): void {
    this.ref.close(value);
  }
}

/**
 * Demo sheet body for the showcase.
 */
@Component({
  selector: 'fb-demo-sheet-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbSheetComponent, FbButtonComponent],
  template: `
    <fb-sheet labelId="demo-sheet-title">
      <span fbSheetHeader id="demo-sheet-title">Weather forecast</span>
      <div fbSheetBody>
        <p>
          Bottom-anchored CDK overlay using token-driven chrome. The slide-up
          animation respects prefers-reduced-motion.
        </p>
        <fb-button variant="secondary" size="md" (pressed)="close()">
          Dismiss
        </fb-button>
      </div>
    </fb-sheet>
  `
})
export class FbDemoSheetBodyComponent {
  private readonly ref = inject(DialogRef);
  close(): void {
    this.ref.close();
  }
}

/**
 * Demo sidenav body for the showcase.
 */
@Component({
  selector: 'fb-demo-sidenav-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbSidenavComponent, FbButtonComponent],
  template: `
    <fb-sidenav [side]="side()" labelId="demo-sidenav-title">
      <span fbSidenavHeader id="demo-sidenav-title">Filters</span>
      <div fbSidenavBody>
        <p>
          Side-anchored CDK Dialog. Backdrop click and Escape both dismiss.
          Slide-in respects prefers-reduced-motion.
        </p>
      </div>
      <ng-container fbSidenavFooter>
        <fb-button variant="secondary" size="md" (pressed)="close()">
          Close
        </fb-button>
      </ng-container>
    </fb-sidenav>
  `
})
export class FbDemoSidenavBodyComponent {
  private readonly ref = inject(DialogRef) as DialogRef<
    unknown,
    FbDemoSidenavBodyComponent
  >;
  readonly side = signal<'left' | 'right'>('left');
  close(): void {
    this.ref.close();
  }
}

/**
 * /design-system showcase page. Renders each Tier-1 primitive with all
 * variants visible plus an inline a11y check note, and a theme switcher
 * (light, dark, and night-red) so reviewers can validate token-driven
 * theme parity in one click. Lazy-loaded by main.ts on the /design-system
 * route so this chunk never reaches the AppComponent bundle.
 */
@Component({
  selector: 'fb-design-system-showcase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FbButtonComponent,
    FbIconComponent,
    FbFabComponent,
    FbInputComponent,
    FbTextareaComponent,
    FbSelectComponent,
    FbSelectTriggerDirective,
    FbCheckboxComponent,
    FbRadioComponent,
    FbRadioGroupComponent,
    FbSwitchComponent,
    FbSliderComponent,
    FbSegmentedComponent,
    FbCardComponent,
    FbCardHeaderComponent,
    FbCardContentComponent,
    FbCardActionsComponent,
    FbDividerComponent,
    FbHintComponent,
    FbToolbarComponent,
    FbProgressBarComponent,
    FbListComponent,
    FbListItemComponent,
    FbNavListComponent,
    FbSelectionListComponent,
    FbTabsComponent,
    FbTabPanelDirective,
    FbAccordionComponent,
    FbExpansionPanelComponent,
    FbExpansionPanelTitleDirective,
    FbExpansionPanelDescriptionDirective,
    FbExpansionPanelIconDirective,
    FbStepperComponent,
    FbStepComponent,
    FbStepActionsDirective,
    FbDatepickerComponent
  ],
  templateUrl: './design-system-showcase.component.html',
  styleUrls: ['./design-system-showcase.component.css']
})
export class DesignSystemShowcaseComponent {
  private readonly dialog = inject(FbDialogService);
  private readonly sheet = inject(FbSheetService);
  private readonly menu = inject(FbMenuService);
  private readonly snackbar = inject(FbSnackbarService);
  private readonly sidenav = inject(FbSidenavService);

  readonly theme = signal<Theme>('light');
  readonly lastDialogResult = signal<string>('');
  readonly sheetOpenCount = signal<number>(0);
  readonly lastMenuResult = signal<string>('');
  readonly lastSnackbarResult = signal<string>('');
  readonly sidenavOpenCount = signal<number>(0);

  readonly menuItems: readonly FbMenuItem[] = [
    { id: 'edit', label: 'Edit', icon: 'edit' },
    { id: 'duplicate', label: 'Duplicate', icon: 'save' },
    { id: 'archive', label: 'Archive', icon: 'visibility_off', disabled: true },
    { id: 'delete', label: 'Delete', icon: 'delete', destructive: true }
  ];

  readonly inputValue = signal<string>('');
  readonly numericInputValue = signal<number | null>(null);
  readonly textareaValue = signal<string>('');
  readonly selectOptions: readonly FbSelectOption[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'night-red', label: 'Night red', disabled: true }
  ];
  readonly selectValue = signal<string | null>(null);
  readonly zoomOptions: readonly FbSelectOption<number>[] = [
    { id: 4, label: 'Zoom 4' },
    { id: 8, label: 'Zoom 8' },
    { id: 12, label: 'Zoom 12' },
    { id: 16, label: 'Zoom 16' }
  ];
  readonly zoomValue = signal<number | null>(null);
  readonly tagOptions: readonly FbSelectOption[] = [
    { id: 'anchor', label: 'Anchor' },
    { id: 'fuel', label: 'Fuel' },
    { id: 'marina', label: 'Marina' },
    { id: 'tide', label: 'Tide note' }
  ];
  readonly tagValues = signal<readonly string[]>([]);
  readonly mimeOptions: readonly FbSelectOption[] = [
    { id: 'md', label: 'Markdown' },
    { id: 'txt', label: 'Plain text' },
    { id: 'html', label: 'HTML' }
  ];
  readonly mimeValue = signal<string | null>('md');
  readonly checkboxChecked = signal<boolean>(false);
  readonly indeterminateChecked = signal<boolean>(false);
  readonly switchChecked = signal<boolean>(false);
  readonly radioValue = signal<string | null>(null);
  readonly radioZoomValue = signal<number | null>(null);
  readonly sliderValue = signal<number>(40);
  readonly segmentedOptions: readonly FbSegmentedOption[] = [
    { id: 'day', label: 'Day', icon: 'light_mode' },
    { id: 'night', label: 'Night', icon: 'dark_mode' },
    { id: 'auto', label: 'Auto', icon: 'brightness_auto' }
  ];
  readonly segmentedValue = signal<string>('day');

  readonly progressValue = signal<number>(35);

  readonly listSelectedRow = signal<string>('');
  readonly selectionOptions: readonly FbSelectionListOption[] = [
    { id: 'anchor', label: 'Anchor', icon: 'anchor' },
    { id: 'fuel', label: 'Fuel', icon: 'local_gas_station' },
    { id: 'marina', label: 'Marina', icon: 'directions_boat' },
    { id: 'tide', label: 'Tide note', disabled: true, icon: 'waves' }
  ];
  readonly selectionValues = signal<readonly string[]>(['anchor']);

  readonly tabDefs: readonly FbTabDef[] = [
    { id: 'info', label: 'Info', icon: 'info' },
    { id: 'route', label: 'Route', icon: 'route' },
    { id: 'notes', label: 'Notes', icon: 'note' },
    { id: 'archived', label: 'Archived', icon: 'archive', disabled: true }
  ];
  readonly tabsActiveId = signal<string | null>('info');

  readonly stepperActive = signal<number>(0);
  readonly stepperStep1Complete = signal<boolean>(false);
  readonly stepperStep2Valid = signal<boolean>(false);
  readonly stepperStep2Complete = signal<boolean>(false);
  readonly stepperFinishCount = signal<number>(0);

  stepperConfirmStep1(): void {
    this.stepperStep1Complete.set(true);
  }
  stepperToggleStep2Valid(): void {
    this.stepperStep2Valid.update((v) => !v);
  }
  stepperMarkStep2Complete(): void {
    this.stepperStep2Complete.set(true);
  }
  onStepperFinish(): void {
    this.stepperFinishCount.update((n) => n + 1);
  }

  readonly datepickerValue = signal<Date | null>(null);
  readonly datepickerBoundedValue = signal<Date | null>(null);
  readonly datepickerDisabledValue = signal<Date | null>(new Date());
  readonly datepickerMin = new Date(2026, 0, 1);
  readonly datepickerMax = new Date(2026, 11, 31);

  setTheme(t: Theme): void {
    this.theme.set(t);
    document.documentElement.setAttribute('data-theme', t);
  }

  openDialog(): void {
    const ref = this.dialog.open<FbDemoDialogBodyComponent, void, string>(
      FbDemoDialogBodyComponent
    );
    ref.closed.subscribe((value) => {
      this.lastDialogResult.set(value ?? '(dismissed)');
    });
  }

  openSheet(): void {
    this.sheet.open<FbDemoSheetBodyComponent>(FbDemoSheetBodyComponent);
    this.sheetOpenCount.update((n) => n + 1);
  }

  openMenu(event: MouseEvent): void {
    const target = (event.target as HTMLElement | null)?.closest('button');
    if (!target) return;
    this.menu.open(target, this.menuItems).subscribe((id) => {
      this.lastMenuResult.set(id ?? '(dismissed)');
    });
  }

  openSnackbar(kind: 'info' | 'success' | 'warn' | 'error'): void {
    const message =
      kind === 'error'
        ? 'Could not save changes'
        : kind === 'warn'
          ? 'Low battery'
          : kind === 'success'
            ? 'Route saved'
            : 'Heads up';
    this.snackbar
      .open(message, { kind, actionLabel: 'Undo' })
      .subscribe((outcome) => this.lastSnackbarResult.set(outcome));
  }

  openSidenav(side: 'left' | 'right'): void {
    const ref = this.sidenav.open<FbDemoSidenavBodyComponent>(
      FbDemoSidenavBodyComponent,
      side
    );
    const instance = ref.componentInstance;
    if (instance) {
      instance.side.set(side);
    }
    this.sidenavOpenCount.update((n) => n + 1);
  }

  selectListRow(id: string): void {
    this.listSelectedRow.set(id);
  }
}
