/*
 * Public barrel for design-system primitives.
 *
 * Tier-1 (already shipped):
 *   - FbButtonComponent
 *   - FbDialogComponent + FbDialogService
 *   - FbSheetComponent + FbSheetService
 *
 * Tier-2 (this gate):
 *   - FbListPaneComponent
 *   - FbDetailPaneComponent
 *   - FbFilterBarComponent
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
