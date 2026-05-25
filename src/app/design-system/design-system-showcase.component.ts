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
 * /design-system showcase page. Lazy-loaded entry: main.ts detects the
 * /design-system URL and dynamically imports this module, which gives
 * esbuild a natural code-split point so the primitives never reach the
 * AppComponent bundle.
 *
 * Renders each Tier-1 primitive in this batch with all variants visible
 * plus an inline a11y check note. Includes a theme switcher (light, dark,
 * and night-red) so reviewers can validate token-driven theme parity in
 * one click without restarting the app.
 */
@Component({
  selector: 'fb-design-system-showcase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FbButtonComponent],
  templateUrl: './design-system-showcase.component.html',
  styleUrls: ['./design-system-showcase.component.css']
})
export class DesignSystemShowcaseComponent {
  private readonly dialog = inject(FbDialogService);
  private readonly sheet = inject(FbSheetService);

  readonly theme = signal<'light' | 'dark' | 'night-red'>('light');
  readonly lastDialogResult = signal<string>('');
  readonly sheetOpenCount = signal<number>(0);

  setTheme(t: 'light' | 'dark' | 'night-red'): void {
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
}
