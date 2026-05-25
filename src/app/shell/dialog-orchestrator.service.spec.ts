import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppFacade } from 'src/app/app.facade';
import { SignalKClient } from 'src/lib/signalk-client';
import {
  CourseService,
  FBCustomResourceService,
  NotificationManager,
  SKResourceService
} from 'src/app/modules';
import { AppShellService } from './app-shell.service';
import { DialogOrchestrator } from './dialog-orchestrator.service';

interface FakeApp {
  showAlert: ReturnType<typeof vi.fn>;
  showMessage: ReturnType<typeof vi.fn>;
  config: { resources: { paths: string[] } };
  data: object;
}

function fakeApp(): FakeApp {
  return {
    showAlert: vi.fn(),
    showMessage: vi.fn(),
    config: { resources: { paths: ['custom-set'] } },
    data: {}
  };
}

function configure(app: FakeApp) {
  TestBed.configureTestingModule({
    providers: [
      { provide: MatDialog, useValue: { open: vi.fn() } },
      { provide: MatBottomSheet, useValue: { open: vi.fn() } },
      { provide: AppFacade, useValue: app },
      { provide: AppShellService, useValue: { focusMap: vi.fn() } },
      { provide: SKResourceService, useValue: {} },
      { provide: FBCustomResourceService, useValue: {} },
      { provide: CourseService, useValue: {} },
      { provide: SignalKClient, useValue: {} },
      { provide: NotificationManager, useValue: {} }
    ]
  });
}

describe('DialogOrchestrator', () => {
  let app: FakeApp;
  let svc: DialogOrchestrator;

  beforeEach(() => {
    TestBed.resetTestingModule();
    app = fakeApp();
    configure(app);
    svc = TestBed.inject(DialogOrchestrator);
  });

  it('importFile dispatches GPX files to processGPX', () => {
    const spy = vi
      .spyOn(svc, 'processGPX')
      .mockResolvedValue(undefined as unknown as void);
    svc.importFile({ data: '<gpx ><wpt/></gpx>', name: 't.gpx' });
    expect(spy).toHaveBeenCalledOnce();
    expect(app.showAlert).not.toHaveBeenCalled();
  });

  it('importFile dispatches GeoJSON files to processGeoJSON', () => {
    const spy = vi
      .spyOn(svc, 'processGeoJSON')
      .mockResolvedValue(undefined as unknown as void);
    svc.importFile({
      data: '{"type": "FeatureCollection","features":[]}',
      name: 't.json'
    });
    expect(spy).toHaveBeenCalledOnce();
  });

  it('importFile rejects unknown formats with an alert', () => {
    svc.importFile({ data: 'random text', name: 't.txt' });
    expect(app.showAlert).toHaveBeenCalledWith(
      'Import',
      'File format not supported!'
    );
  });

  it('showWeather ignores non-forecast modes', () => {
    const bs = TestBed.inject(MatBottomSheet) as unknown as {
      open: ReturnType<typeof vi.fn>;
    };
    svc.showWeather('hindcast');
    expect(bs.open).not.toHaveBeenCalled();
  });

  it('openExperiment skips unknown choices', () => {
    const bs = TestBed.inject(MatBottomSheet) as unknown as {
      open: ReturnType<typeof vi.fn>;
    };
    svc.openExperiment({ choice: 'unknown-experiment' });
    expect(bs.open).not.toHaveBeenCalled();
  });
});
