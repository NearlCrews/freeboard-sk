import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FbDetailPaneComponent } from './detail-pane.component';

@Component({
  standalone: true,
  imports: [FbDetailPaneComponent],
  template: `
    <fb-detail-pane [title]="title()" [subtitle]="subtitle()">
      @if (showBody()) {
        <p class="custom-body">Detail content here</p>
      }
      @if (showActions()) {
        <ng-template #fbDetailPaneActions>
          <button type="button" class="custom-action">Save</button>
        </ng-template>
      }
    </fb-detail-pane>
  `
})
class HostComponent {
  title = signal('Route: Coastal');
  subtitle = signal<string | null>('12.4 nm');
  showBody = signal(true);
  showActions = signal(true);
}

describe('FbDetailPaneComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let pane: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    pane = fixture.nativeElement.querySelector('fb-detail-pane');
  });

  it('renders title, subtitle, projected body, and action slot', () => {
    expect(pane.querySelector('.fb-detail-pane__title')?.textContent).toContain(
      'Route: Coastal'
    );
    expect(
      pane.querySelector('.fb-detail-pane__subtitle')?.textContent
    ).toContain('12.4 nm');
    expect(pane.querySelector('.custom-body')?.textContent).toContain(
      'Detail content here'
    );
    expect(pane.querySelector('.custom-action')?.textContent).toContain('Save');
  });

  it('always renders an empty-state slot announcing "No selection" for assistive tech', () => {
    const empty = pane.querySelector('.fb-detail-pane__empty');
    expect(empty?.textContent?.trim()).toBe('No selection');
    expect(empty?.getAttribute('role')).toBe('status');
    expect(empty?.getAttribute('aria-live')).toBe('polite');
  });

  it('omits the default header block when title and subtitle are empty', () => {
    host.title.set('');
    host.subtitle.set(null);
    fixture.detectChanges();
    expect(pane.querySelector('.fb-detail-pane__header')).toBeNull();
  });
});
