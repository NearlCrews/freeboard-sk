import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FbBottomSheetService,
  FbDialogService
} from 'src/app/design-system/primitives';
import { AppFacade } from 'src/app/app.facade';
import { AlarmStore, SettingsStore } from 'src/app/stores';
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
  config: { resources: { paths: string[] } };
  data: object;
}

interface FakeAlarm {
  showAlert: ReturnType<typeof vi.fn>;
  showMsgBox: ReturnType<typeof vi.fn>;
  showConfirm: ReturnType<typeof vi.fn>;
  showMessage: ReturnType<typeof vi.fn>;
  parseHttpErrorResponse: ReturnType<typeof vi.fn>;
}

function fakeApp(): FakeApp {
  return {
    config: { resources: { paths: ['custom-set'] } },
    data: {}
  };
}

function fakeAlarm(): FakeAlarm {
  return {
    showAlert: vi.fn(),
    showMsgBox: vi.fn(),
    showConfirm: vi.fn(),
    showMessage: vi.fn(),
    parseHttpErrorResponse: vi.fn()
  };
}

function configure(app: FakeApp, alarm: FakeAlarm) {
  TestBed.configureTestingModule({
    providers: [
      { provide: FbDialogService, useValue: { open: vi.fn() } },
      { provide: FbBottomSheetService, useValue: { open: vi.fn() } },
      { provide: AppFacade, useValue: app },
      { provide: AlarmStore, useValue: alarm },
      { provide: SettingsStore, useValue: { sIsFetching: { set: vi.fn() } } },
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
  let alarm: FakeAlarm;
  let svc: DialogOrchestrator;

  beforeEach(() => {
    TestBed.resetTestingModule();
    app = fakeApp();
    alarm = fakeAlarm();
    configure(app, alarm);
    svc = TestBed.inject(DialogOrchestrator);
  });

  it('importFile dispatches GPX files to processGPX', () => {
    const spy = vi
      .spyOn(svc, 'processGPX')
      .mockResolvedValue(undefined as unknown as void);
    svc.importFile({ data: '<gpx ><wpt/></gpx>', name: 't.gpx' });
    expect(spy).toHaveBeenCalledOnce();
    expect(alarm.showAlert).not.toHaveBeenCalled();
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
    expect(alarm.showAlert).toHaveBeenCalledWith(
      'Import',
      'File format not supported!'
    );
  });

  it('showWeather ignores non-forecast modes', () => {
    const bs = TestBed.inject(FbBottomSheetService) as unknown as {
      open: ReturnType<typeof vi.fn>;
    };
    svc.showWeather('hindcast');
    expect(bs.open).not.toHaveBeenCalled();
  });

  it('openExperiment skips unknown choices', () => {
    const bs = TestBed.inject(FbBottomSheetService) as unknown as {
      open: ReturnType<typeof vi.fn>;
    };
    svc.openExperiment({ choice: 'unknown-experiment' });
    expect(bs.open).not.toHaveBeenCalled();
  });
});
