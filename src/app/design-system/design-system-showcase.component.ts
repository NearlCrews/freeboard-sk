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
  imports: [FbButtonComponent, FbIconComponent, FbFabComponent],
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
}
