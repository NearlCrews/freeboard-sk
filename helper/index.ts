import {
  Context,
  Meta,
  Path,
  Plugin,
  ServerAPI,
  SKVersion
} from '@signalk/server-api';
import { IRouter, Application, Request, Response } from 'express';
import { initAlarms, shutdownAlarms } from './alarms/alarms';

import * as openapi from './openApi.json';

//const defaultPollInterval = 60;

const CONFIG_SCHEMA = {
  properties: {}
};

const CONFIG_UISCHEMA = {};

interface AlarmSettings {
  enable: boolean;
  [key: string]: unknown;
}

interface SETTINGS {
  alarms: AlarmSettings;
}

export interface FreeboardHelperApp extends Application, ServerAPI {}

module.exports = (server: FreeboardHelperApp): Plugin => {
  // ** default configuration settings
  let settings: SETTINGS = {
    alarms: {
      enable: true
    }
  };

  // ******** REQUIRED PLUGIN DEFINITION *******
  const plugin: Plugin = {
    id: 'signalk-open-binnacle',
    name: 'Open Binnacle',
    schema: () => CONFIG_SCHEMA,
    uiSchema: () => CONFIG_UISCHEMA,
    start: (options) => {
      doStartup(options as SETTINGS);
    },
    stop: () => {
      doShutdown();
    },
    registerWithRouter: (router) => {
      return initApiEndpoints(router);
    },
    getOpenApi: () => openapi
  };
  // ************************************

  const doStartup = (options: SETTINGS) => {
    try {
      server.debug(`${plugin.name} starting.......`);

      if (typeof options !== 'undefined') {
        settings = options;
      }

      /**
       * emit metas for environment paths
       * @todo remove after merge of https://github.com/SignalK/specification/pull/662
       */
      emitMeteoMetas();

      settings.alarms = options.alarms ?? {
        enable: true
      };
      // const f = await server.getFeatures();
      settings.alarms.enable = true; //!f.apis.includes('notifications' as any);

      server.debug(`Applied config: ${JSON.stringify(settings)}`);

      if (settings.alarms.enable) {
        initAlarms(server, plugin.id);
      }
      server.setPluginStatus('Started');
    } catch (error) {
      server.setPluginError('Started with errors!');
      server.error('** EXCEPTION: **');
      const stack = error instanceof Error ? error.stack : String(error);
      server.error(stack ?? 'unknown error');
    }
  };

  const doShutdown = () => {
    server.debug('** shutting down **');
    server.debug('** Un-subscribing from events **');
    shutdownAlarms();
    const msg = 'Stopped';
    server.setPluginStatus(msg);
  };

  const initApiEndpoints = (router: IRouter) => {
    server.debug(`Initialising Open Binnacle plugin endpoints.......`);

    router.get('/settings', (req: Request, res: Response) => {
      res.status(200).json({
        settings: settings
      });
    });
  };

  /**
   * Ensure meta delta are emitted for environment paths
   * @todo remove after merge of https://github.com/SignalK/specification/pull/662
   */
  const emitMeteoMetas = () => {
    const pathRoot = 'environment';
    const metas: Meta[] = [];
    const pushMeta = (path: string, value: Meta['value']) => {
      metas.push({ path: path as Path, value });
    };
    server.debug('**** Building METEO metas *****');
    pushMeta(`${pathRoot}.date`, {
      description: 'Time of measurement.'
    });
    pushMeta(`${pathRoot}.sun.sunrise`, {
      description: 'Time of sunrise at the related position.'
    });
    pushMeta(`${pathRoot}.sun.sunset`, {
      description: 'Time of sunset at the related position.'
    });
    pushMeta(`${pathRoot}.outside.uvIndex`, {
      description: 'Level of UV radiation. 1 UVI = 25mW/sqm',
      units: 'UVI'
    });
    pushMeta(`${pathRoot}.outside.cloudCover`, {
      description: 'Cloud clover.',
      units: 'ratio'
    });
    pushMeta(`${pathRoot}.outside.temperature`, {
      description: 'Outside air temperature.',
      units: 'K'
    });
    pushMeta(`${pathRoot}.outside.dewPointTemperature`, {
      description: 'Dew point.',
      units: 'K'
    });
    pushMeta(`${pathRoot}.outside.feelsLikeTemperature`, {
      description: 'Feels like temperature.',
      units: 'K'
    });
    pushMeta(`${pathRoot}.outside.horizontalVisibility`, {
      description: 'Horizontal visibility.',
      units: 'm'
    });
    pushMeta(`${pathRoot}.outside.horizontalVisibilityOverRange`, {
      description:
        'Visibilty distance is greater than the range of the measuring equipment.'
    });
    pushMeta(`${pathRoot}.outside.pressure`, {
      description: 'Barometric pressure.',
      units: 'Pa'
    });
    pushMeta(`${pathRoot}.outside.pressureTendency`, {
      description:
        'Integer value indicating barometric pressure value tendency e.g. 0 = steady, etc.'
    });
    pushMeta(`${pathRoot}.outside.pressureTendencyType`, {
      description:
        'Description for the value of pressureTendency e.g. steady, increasing, decreasing.'
    });
    pushMeta(`${pathRoot}.outside.relativeHumidity`, {
      description: 'Relative humidity.',
      units: 'ratio'
    });
    pushMeta(`${pathRoot}.outside.absoluteHumidity`, {
      description: 'Absolute humidity.',
      units: 'ratio'
    });
    pushMeta(`${pathRoot}.outside.precipitationVolume`, {
      description: 'Precipitation Volume.',
      units: 'm'
    });
    pushMeta(`${pathRoot}.wind.averageSpeed`, {
      description: 'Average wind speed.',
      units: 'm/s'
    });
    pushMeta(`${pathRoot}.wind.speedTrue`, {
      description: 'True wind speed.',
      units: 'm/s'
    });
    pushMeta(`${pathRoot}.wind.directionTrue`, {
      description: 'The wind direction relative to true north.',
      units: 'rad'
    });
    pushMeta(`${pathRoot}.wind.gust`, {
      description: 'Maximum wind gust.',
      units: 'm/s'
    });
    pushMeta(`${pathRoot}.wind.gustDirectionTrue`, {
      description: 'Maximum wind gust direction.',
      units: 'rad'
    });
    pushMeta(`${pathRoot}.wind.gust`, {
      description: 'Maximum wind gust.',
      units: 'm/s'
    });
    pushMeta(`${pathRoot}.water.level`, {
      description: 'Water level.',
      units: 'm'
    });
    pushMeta(`${pathRoot}.water.temperature`, {
      description: 'Water temperature.',
      units: 'K'
    });
    pushMeta(`${pathRoot}.water.salinity`, {
      description: 'Water salinity.',
      units: 'ratio'
    });
    pushMeta(`${pathRoot}.water.levelTendency`, {
      description:
        'Integer value indicating water level tendency e.g. 0 = steady, etc.'
    });
    pushMeta(`${pathRoot}.water.levelTendencyType`, {
      description:
        'Description for the value of levelTendency e.g. steady, increasing, decreasing.'
    });
    pushMeta(`${pathRoot}.water.current.set`, {
      description: 'Water current direction.',
      units: 'rad'
    });
    pushMeta(`${pathRoot}.water.current.drift`, {
      description: 'Water current speed.',
      units: 'm/s'
    });
    pushMeta(`${pathRoot}.water.waves.significantHeight`, {
      description: 'Significant wave height.',
      units: 'm'
    });
    pushMeta(`${pathRoot}.water.waves.period`, {
      description: 'Wave period.',
      units: 'ms'
    });
    pushMeta(`${pathRoot}.water.waves.direction`, {
      description: 'Wave direction.',
      units: 'rad'
    });
    pushMeta(`${pathRoot}.water.swell.significantHeight`, {
      description: 'Significant swell height.',
      units: 'm'
    });
    pushMeta(`${pathRoot}.water.swell.period`, {
      description: 'Swell period.',
      units: 'ms'
    });
    pushMeta(`${pathRoot}.water.swell.directionTrue`, {
      description: 'Swell direction.',
      units: 'rad'
    });

    server.debug('****  Sending METEO metas *****');
    server.handleMessage(
      plugin.id,
      {
        context: `meteo` as Context,
        updates: [
          {
            meta: metas
          }
        ]
      },
      SKVersion.v1
    );
  };

  return plugin;
};
