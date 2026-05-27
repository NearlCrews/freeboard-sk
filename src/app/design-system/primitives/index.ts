/*
 * Public barrel for design-system primitives.
 *
 * Tier-1 (shipped):
 *   - FbButtonComponent
 *   - FbDialogComponent + FbDialogService
 *   - FbSheetComponent + FbSheetService
 *   - FbIconComponent
 *   - FbFabComponent
 *   - FbMenuComponent + FbMenuService
 *   - FbSnackbarComponent + FbSnackbarService
 *   - FbSidenavComponent + FbSidenavService
 *
 * Tier-2 layout (shipped):
 *   - FbListPaneComponent
 *   - FbDetailPaneComponent
 *   - FbFilterBarComponent
 *
 * Tier-2 forms (shipped):
 *   - FbInputComponent
 *   - FbTextareaComponent
 *   - FbSelectComponent
 *   - FbCheckboxComponent
 *   - FbRadioComponent + FbRadioGroupComponent
 *   - FbSwitchComponent
 *   - FbSliderComponent
 *   - FbSegmentedComponent
 */

export {
  FbButtonComponent,
  type FbButtonSize,
  type FbButtonVariant
} from './button/button.component';

export { FbDialogComponent } from './dialog/dialog.component';
export { FbDialogService } from './dialog/dialog.service';

export { FbSheetComponent } from './sheet/sheet.component';
export { FbSheetService } from './sheet/sheet.service';

export {
  FbListPaneComponent,
  type FbListPaneItem
} from './list-pane/list-pane.component';

export { FbDetailPaneComponent } from './detail-pane/detail-pane.component';

export {
  FbFilterBarComponent,
  type FbFilterChip
} from './filter-bar/filter-bar.component';

export {
  FbIconComponent,
  type FbIconFill,
  type FbIconSize,
  type FbIconWeight
} from './icon/icon.component';

export {
  FbFabComponent,
  type FbFabPosition,
  type FbFabVariant
} from './fab/fab.component';

export { FbMenuComponent, type FbMenuItem } from './menu/menu.component';
export { FbMenuService } from './menu/menu.service';

export {
  FbSnackbarComponent,
  type FbSnackbarKind
} from './snackbar/snackbar.component';
export {
  FbSnackbarService,
  type FbSnackbarOptions,
  type FbSnackbarOutcome
} from './snackbar/snackbar.service';

export {
  FbSidenavComponent,
  type FbSidenavSide
} from './sidenav/sidenav.component';
export { FbSidenavService } from './sidenav/sidenav.service';

export { FbInputComponent, type FbInputType } from './input/input.component';

export { FbTextareaComponent } from './textarea/textarea.component';

export {
  FbSelectComponent,
  FbSelectTriggerDirective,
  type FbSelectOption
} from './select/select.component';

export { FbCheckboxComponent } from './checkbox/checkbox.component';

export { FbRadioComponent } from './radio/radio.component';
export {
  FbRadioGroupComponent,
  type RadioGroupHost
} from './radio/radio-group.component';

export { FbSwitchComponent } from './switch/switch.component';

export { FbSliderComponent } from './slider/slider.component';

export {
  FbSegmentedComponent,
  type FbSegmentedOption
} from './segmented/segmented.component';

/* Tier-3 simple primitives (this gate). */
export {
  FbCardComponent,
  FbCardHeaderComponent,
  FbCardContentComponent,
  FbCardActionsComponent,
  type FbCardActionsAlign,
  type FbCardVariant
} from './card/card.component';
export {
  FbDividerComponent,
  type FbDividerOrientation
} from './divider/divider.component';
export { FbHintComponent, type FbHintVariant } from './hint/hint.component';
export {
  FbToolbarComponent,
  type FbToolbarDensity
} from './toolbar/toolbar.component';
export { FbProgressBarComponent } from './progress-bar/progress-bar.component';

/* Tier-3 list family + tabs (this gate). */
export {
  FbListComponent,
  FbListItemComponent,
  FbNavListComponent,
  FbSelectionListComponent,
  type FbListDensity,
  type FbSelectionListOption
} from './list/list.component';

export {
  FbTabsComponent,
  FbTabPanelDirective,
  type FbTabDef
} from './tabs/tabs.component';

/* Tier-3 expansion panel + accordion (this gate). */
export {
  FbAccordionComponent,
  FbExpansionPanelComponent,
  FbExpansionPanelTitleDirective,
  FbExpansionPanelDescriptionDirective,
  FbExpansionPanelIconDirective,
  type AccordionHost
} from './expansion-panel/expansion-panel.component';

/* Tier-3 stepper (this gate). */
export {
  FbStepperComponent,
  FbStepComponent,
  FbStepActionsDirective
} from './stepper/stepper.component';

/* Tier-3 datepicker (this gate). */
export { FbDatepickerComponent } from './datepicker/datepicker.component';
