import { ALARM_STATE } from 'src/app/types/stream';

/**
 * Map a SignalK ALARM_STATE to a token-backed CSS class.
 *
 * Token sources live in src/tokens.css under --safety-alert-*. They are
 * theme-invariant by design so an `alarm` notification stays red, and a
 * `warn` notification stays yellow, in dark mode and night-red
 * (IEC 62288 / IMO MSC.302(87)).
 *
 * State to class to token:
 *   emergency : .fb-alert-emergency : --safety-alert-emergency (red)
 *   alarm     : .fb-alert-alarm     : --safety-alert-alarm     (red)
 *   warn      : .fb-alert-warn      : --safety-alert-warn      (yellow)
 *   alert     : .fb-alert-caution   : --safety-alert-caution   (yellow, lower)
 *   normal    : ''                  : (no safety color)
 *   nominal   : ''                  : (no safety color)
 *
 * Returns an empty string for nominal/normal so callers can spread the
 * result into [ngClass] without conditionals.
 */
export function alertSeverityClass(priority: ALARM_STATE): string {
  switch (priority) {
    case ALARM_STATE.emergency:
      return 'fb-alert-emergency';
    case ALARM_STATE.alarm:
      return 'fb-alert-alarm';
    case ALARM_STATE.warn:
      return 'fb-alert-warn';
    case ALARM_STATE.alert:
      return 'fb-alert-caution';
    default:
      return '';
  }
}
