// AUTO-GENERATED, do not edit by hand. Run pnpm codegen.
// Source: @signalk/signalk-schema v1.8.2
//
// Brand semantics: Path, Context, and SourceRef are nominal string
// types. The brand is a phantom property keyed by a unique symbol, so
// every brand is erased by tsc and there is zero runtime cost. Construct
// branded values with the as* helpers below or with `as Path` casts at
// trust boundaries (delta ingestion, REST request handlers, and WS).
//
// Coverage: 258 literal paths, 320 template paths, and 264 typed leaves.

// ---- Brand helpers ----

declare const PathBrand: unique symbol;
declare const ContextBrand: unique symbol;
declare const SourceRefBrand: unique symbol;

export type Path = string & { readonly [PathBrand]: never };
export type Context = string & { readonly [ContextBrand]: never };
export type SourceRef = string & { readonly [SourceRefBrand]: never };

export const asPath = (s: string): Path => s as Path;
export const asContext = (s: string): Context => s as Context;
export const asSourceRef = (s: string): SourceRef => s as SourceRef;

// ---- Value shapes referenced by PathValueOf ----

export interface PositionValue {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface AttitudeValue {
  yaw?: number;
  pitch?: number;
  roll?: number;
}

// ---- Known Signal K paths ----
//
// LiteralKnownPath: every fully-qualified path the schema declares.
// TemplateKnownPath: paths under instance-id slots like propulsion.<id>.
// The slot uses TypeScript template literals so any non-empty string is
// assignment-compatible. KnownPath is the union of both.

export type LiteralKnownPath =
  | 'communication'
  | 'communication.callsignHf'
  | 'communication.callsignVhf'
  | 'communication.crewNames'
  | 'communication.email'
  | 'communication.emailHf'
  | 'communication.phoneNumber'
  | 'communication.satPhoneNumber'
  | 'communication.skipperName'
  | 'design'
  | 'design.airHeight'
  | 'design.aisShipType'
  | 'design.beam'
  | 'design.displacement'
  | 'design.draft'
  | 'design.keel'
  | 'design.keel.angle'
  | 'design.keel.lift'
  | 'design.keel.type'
  | 'design.length'
  | 'design.rigging'
  | 'design.rigging.configuration'
  | 'design.rigging.masts'
  | 'electrical'
  | 'electrical.ac'
  | 'electrical.alternators'
  | 'electrical.batteries'
  | 'electrical.chargers'
  | 'electrical.inverters'
  | 'electrical.solar'
  | 'environment'
  | 'environment.current'
  | 'environment.depth'
  | 'environment.depth.belowKeel'
  | 'environment.depth.belowSurface'
  | 'environment.depth.belowTransducer'
  | 'environment.depth.surfaceToTransducer'
  | 'environment.depth.transducerToKeel'
  | 'environment.heave'
  | 'environment.inside'
  | 'environment.inside.[A-Za-z0-9]+'
  | 'environment.inside.[A-Za-z0-9]+.airDensity'
  | 'environment.inside.[A-Za-z0-9]+.dewPoint'
  | 'environment.inside.[A-Za-z0-9]+.dewPointTemperature'
  | 'environment.inside.[A-Za-z0-9]+.heatIndexTemperature'
  | 'environment.inside.[A-Za-z0-9]+.illuminance'
  | 'environment.inside.[A-Za-z0-9]+.pressure'
  | 'environment.inside.[A-Za-z0-9]+.relativeHumidity'
  | 'environment.inside.[A-Za-z0-9]+.temperature'
  | 'environment.inside.airDensity'
  | 'environment.inside.dewPoint'
  | 'environment.inside.dewPointTemperature'
  | 'environment.inside.heatIndexTemperature'
  | 'environment.inside.illuminance'
  | 'environment.inside.pressure'
  | 'environment.inside.relativeHumidity'
  | 'environment.inside.temperature'
  | 'environment.mode'
  | 'environment.outside'
  | 'environment.outside.airDensity'
  | 'environment.outside.apparentWindChillTemperature'
  | 'environment.outside.dewPointTemperature'
  | 'environment.outside.heatIndexTemperature'
  | 'environment.outside.humidity'
  | 'environment.outside.illuminance'
  | 'environment.outside.pressure'
  | 'environment.outside.relativeHumidity'
  | 'environment.outside.temperature'
  | 'environment.outside.theoreticalWindChillTemperature'
  | 'environment.tide'
  | 'environment.tide.heightHigh'
  | 'environment.tide.heightLow'
  | 'environment.tide.heightNow'
  | 'environment.tide.timeHigh'
  | 'environment.tide.timeLow'
  | 'environment.time'
  | 'environment.time.millis'
  | 'environment.time.timezoneOffset'
  | 'environment.time.timezoneRegion'
  | 'environment.water'
  | 'environment.water.salinity'
  | 'environment.water.temperature'
  | 'environment.wind'
  | 'environment.wind.angleApparent'
  | 'environment.wind.angleTrueGround'
  | 'environment.wind.angleTrueWater'
  | 'environment.wind.directionChangeAlarm'
  | 'environment.wind.directionMagnetic'
  | 'environment.wind.directionTrue'
  | 'environment.wind.speedApparent'
  | 'environment.wind.speedOverGround'
  | 'environment.wind.speedTrue'
  | 'flag'
  | 'mmsi'
  | 'mothershipMmsi'
  | 'name'
  | 'navigation'
  | 'navigation.anchor'
  | 'navigation.anchor.currentRadius'
  | 'navigation.anchor.maxRadius'
  | 'navigation.anchor.position'
  | 'navigation.attitude'
  | 'navigation.closestApproach'
  | 'navigation.courseGreatCircle'
  | 'navigation.courseGreatCircle.activeRoute'
  | 'navigation.courseGreatCircle.activeRoute.estimatedTimeOfArrival'
  | 'navigation.courseGreatCircle.activeRoute.href'
  | 'navigation.courseGreatCircle.activeRoute.startTime'
  | 'navigation.courseGreatCircle.bearingTrackMagnetic'
  | 'navigation.courseGreatCircle.bearingTrackTrue'
  | 'navigation.courseGreatCircle.crossTrackError'
  | 'navigation.courseGreatCircle.nextPoint'
  | 'navigation.courseGreatCircle.previousPoint'
  | 'navigation.courseGreatCircle.previousPoint.distance'
  | 'navigation.courseGreatCircle.previousPoint.position'
  | 'navigation.courseOverGroundMagnetic'
  | 'navigation.courseOverGroundTrue'
  | 'navigation.courseRhumbline'
  | 'navigation.courseRhumbline.activeRoute'
  | 'navigation.courseRhumbline.activeRoute.estimatedTimeOfArrival'
  | 'navigation.courseRhumbline.activeRoute.href'
  | 'navigation.courseRhumbline.activeRoute.startTime'
  | 'navigation.courseRhumbline.bearingTrackMagnetic'
  | 'navigation.courseRhumbline.bearingTrackTrue'
  | 'navigation.courseRhumbline.crossTrackError'
  | 'navigation.courseRhumbline.nextPoint'
  | 'navigation.courseRhumbline.previousPoint'
  | 'navigation.courseRhumbline.previousPoint.distance'
  | 'navigation.courseRhumbline.previousPoint.position'
  | 'navigation.datetime'
  | 'navigation.datetime.gnssTimeSource'
  | 'navigation.destination'
  | 'navigation.destination.commonName'
  | 'navigation.destination.eta'
  | 'navigation.destination.waypoint'
  | 'navigation.gnss'
  | 'navigation.gnss.antennaAltitude'
  | 'navigation.gnss.differentialAge'
  | 'navigation.gnss.differentialReference'
  | 'navigation.gnss.geoidalSeparation'
  | 'navigation.gnss.horizontalDilution'
  | 'navigation.gnss.integrity'
  | 'navigation.gnss.methodQuality'
  | 'navigation.gnss.positionDilution'
  | 'navigation.gnss.satellites'
  | 'navigation.gnss.type'
  | 'navigation.headingCompass'
  | 'navigation.headingMagnetic'
  | 'navigation.headingTrue'
  | 'navigation.leewayAngle'
  | 'navigation.lights'
  | 'navigation.log'
  | 'navigation.magneticDeviation'
  | 'navigation.magneticVariation'
  | 'navigation.magneticVariationAgeOfService'
  | 'navigation.maneuver'
  | 'navigation.position'
  | 'navigation.racing'
  | 'navigation.racing.distanceStartline'
  | 'navigation.racing.layline'
  | 'navigation.racing.layline.distance'
  | 'navigation.racing.layline.time'
  | 'navigation.racing.oppositeLayline'
  | 'navigation.racing.oppositeLayline.distance'
  | 'navigation.racing.oppositeLayline.time'
  | 'navigation.racing.startLinePort'
  | 'navigation.racing.startLineStb'
  | 'navigation.racing.timePortDown'
  | 'navigation.racing.timePortUp'
  | 'navigation.racing.timeStbdDown'
  | 'navigation.racing.timeStbdUp'
  | 'navigation.racing.timeToStart'
  | 'navigation.rateOfTurn'
  | 'navigation.speedOverGround'
  | 'navigation.speedThroughWater'
  | 'navigation.speedThroughWaterLongitudinal'
  | 'navigation.speedThroughWaterTransverse'
  | 'navigation.state'
  | 'navigation.trip'
  | 'navigation.trip.lastReset'
  | 'navigation.trip.log'
  | 'notifications'
  | 'notifications.abandon'
  | 'notifications.adrift'
  | 'notifications.collision'
  | 'notifications.fire'
  | 'notifications.flooding'
  | 'notifications.grounding'
  | 'notifications.listing'
  | 'notifications.mob'
  | 'notifications.piracy'
  | 'notifications.sinking'
  | 'performance'
  | 'performance.activePolar'
  | 'performance.activePolarData'
  | 'performance.activePolarData.description'
  | 'performance.activePolarData.id'
  | 'performance.activePolarData.name'
  | 'performance.activePolarData.windData'
  | 'performance.beatAngle'
  | 'performance.beatAngleTargetSpeed'
  | 'performance.beatAngleVelocityMadeGood'
  | 'performance.gybeAngle'
  | 'performance.gybeAngleTargetSpeed'
  | 'performance.gybeAngleVelocityMadeGood'
  | 'performance.leeway'
  | 'performance.polarSpeed'
  | 'performance.polarSpeedRatio'
  | 'performance.polars'
  | 'performance.tackMagnetic'
  | 'performance.tackTrue'
  | 'performance.targetAngle'
  | 'performance.targetSpeed'
  | 'performance.velocityMadeGood'
  | 'performance.velocityMadeGoodToWaypoint'
  | 'port'
  | 'propulsion'
  | 'registrations'
  | 'registrations.imo'
  | 'registrations.local'
  | 'registrations.national'
  | 'registrations.other'
  | 'sails'
  | 'sails.area'
  | 'sails.area.active'
  | 'sails.area.total'
  | 'sails.inventory'
  | 'sensors'
  | 'steering'
  | 'steering.autopilot'
  | 'steering.autopilot.backlash'
  | 'steering.autopilot.deadZone'
  | 'steering.autopilot.gain'
  | 'steering.autopilot.maxDriveCurrent'
  | 'steering.autopilot.maxDriveRate'
  | 'steering.autopilot.mode'
  | 'steering.autopilot.portLock'
  | 'steering.autopilot.starboardLock'
  | 'steering.autopilot.state'
  | 'steering.autopilot.target'
  | 'steering.autopilot.target.headingMagnetic'
  | 'steering.autopilot.target.headingTrue'
  | 'steering.autopilot.target.windAngleApparent'
  | 'steering.autopilot.target.windAngleTrue'
  | 'steering.rudderAngle'
  | 'steering.rudderAngleTarget'
  | 'tanks'
  | 'tanks.baitWell'
  | 'tanks.ballast'
  | 'tanks.blackWater'
  | 'tanks.freshWater'
  | 'tanks.fuel'
  | 'tanks.gas'
  | 'tanks.liveWell'
  | 'tanks.lubrication'
  | 'tanks.wasteWater'
  | 'url'
  | 'uuid';

export type TemplateKnownPath =
  | `electrical.ac.${string}`
  | `electrical.ac.${string}.dateInstalled`
  | `electrical.ac.${string}.location`
  | `electrical.ac.${string}.manufacturer`
  | `electrical.ac.${string}.manufacturer.URL`
  | `electrical.ac.${string}.manufacturer.model`
  | `electrical.ac.${string}.manufacturer.name`
  | `electrical.ac.${string}.name`
  | `electrical.ac.${string}.phase`
  | `electrical.ac.${string}.phase.(single)|([A-C])`
  | `electrical.ac.${string}.phase.(single)|([A-C]).apparentPower`
  | `electrical.ac.${string}.phase.(single)|([A-C]).associatedBus`
  | `electrical.ac.${string}.phase.(single)|([A-C]).current`
  | `electrical.ac.${string}.phase.(single)|([A-C]).frequency`
  | `electrical.ac.${string}.phase.(single)|([A-C]).lineLineVoltage`
  | `electrical.ac.${string}.phase.(single)|([A-C]).lineNeutralVoltage`
  | `electrical.ac.${string}.phase.(single)|([A-C]).powerFactor`
  | `electrical.ac.${string}.phase.(single)|([A-C]).powerFactorLagging`
  | `electrical.ac.${string}.phase.(single)|([A-C]).reactivePower`
  | `electrical.ac.${string}.phase.(single)|([A-C]).realPower`
  | `electrical.alternators.${string}`
  | `electrical.alternators.${string}.associatedBus`
  | `electrical.alternators.${string}.chargerRole`
  | `electrical.alternators.${string}.chargingAlgorithm`
  | `electrical.alternators.${string}.chargingMode`
  | `electrical.alternators.${string}.current`
  | `electrical.alternators.${string}.dateInstalled`
  | `electrical.alternators.${string}.fieldDrive`
  | `electrical.alternators.${string}.location`
  | `electrical.alternators.${string}.manufacturer`
  | `electrical.alternators.${string}.manufacturer.URL`
  | `electrical.alternators.${string}.manufacturer.model`
  | `electrical.alternators.${string}.manufacturer.name`
  | `electrical.alternators.${string}.name`
  | `electrical.alternators.${string}.pulleyRatio`
  | `electrical.alternators.${string}.regulatorTemperature`
  | `electrical.alternators.${string}.revolutions`
  | `electrical.alternators.${string}.setpointCurrent`
  | `electrical.alternators.${string}.setpointVoltage`
  | `electrical.alternators.${string}.temperature`
  | `electrical.alternators.${string}.temperature.faultLower`
  | `electrical.alternators.${string}.temperature.faultUpper`
  | `electrical.alternators.${string}.temperature.warnLower`
  | `electrical.alternators.${string}.temperature.warnUpper`
  | `electrical.alternators.${string}.voltage`
  | `electrical.alternators.${string}.voltage.ripple`
  | `electrical.batteries.${string}`
  | `electrical.batteries.${string}.associatedBus`
  | `electrical.batteries.${string}.capacity`
  | `electrical.batteries.${string}.capacity.actual`
  | `electrical.batteries.${string}.capacity.dischargeLimit`
  | `electrical.batteries.${string}.capacity.dischargeSinceFull`
  | `electrical.batteries.${string}.capacity.nominal`
  | `electrical.batteries.${string}.capacity.remaining`
  | `electrical.batteries.${string}.capacity.stateOfCharge`
  | `electrical.batteries.${string}.capacity.stateOfHealth`
  | `electrical.batteries.${string}.capacity.timeRemaining`
  | `electrical.batteries.${string}.chemistry`
  | `electrical.batteries.${string}.current`
  | `electrical.batteries.${string}.dateInstalled`
  | `electrical.batteries.${string}.lifetimeDischarge`
  | `electrical.batteries.${string}.lifetimeRecharge`
  | `electrical.batteries.${string}.location`
  | `electrical.batteries.${string}.manufacturer`
  | `electrical.batteries.${string}.manufacturer.URL`
  | `electrical.batteries.${string}.manufacturer.model`
  | `electrical.batteries.${string}.manufacturer.name`
  | `electrical.batteries.${string}.name`
  | `electrical.batteries.${string}.temperature`
  | `electrical.batteries.${string}.temperature.faultLower`
  | `electrical.batteries.${string}.temperature.faultUpper`
  | `electrical.batteries.${string}.temperature.limitDischargeLower`
  | `electrical.batteries.${string}.temperature.limitDischargeUpper`
  | `electrical.batteries.${string}.temperature.limitRechargeLower`
  | `electrical.batteries.${string}.temperature.limitRechargeUpper`
  | `electrical.batteries.${string}.temperature.warnLower`
  | `electrical.batteries.${string}.temperature.warnUpper`
  | `electrical.batteries.${string}.voltage`
  | `electrical.batteries.${string}.voltage.ripple`
  | `electrical.chargers.${string}`
  | `electrical.chargers.${string}.associatedBus`
  | `electrical.chargers.${string}.chargerRole`
  | `electrical.chargers.${string}.chargingAlgorithm`
  | `electrical.chargers.${string}.chargingMode`
  | `electrical.chargers.${string}.current`
  | `electrical.chargers.${string}.dateInstalled`
  | `electrical.chargers.${string}.location`
  | `electrical.chargers.${string}.manufacturer`
  | `electrical.chargers.${string}.manufacturer.URL`
  | `electrical.chargers.${string}.manufacturer.model`
  | `electrical.chargers.${string}.manufacturer.name`
  | `electrical.chargers.${string}.name`
  | `electrical.chargers.${string}.setpointCurrent`
  | `electrical.chargers.${string}.setpointVoltage`
  | `electrical.chargers.${string}.temperature`
  | `electrical.chargers.${string}.temperature.faultLower`
  | `electrical.chargers.${string}.temperature.faultUpper`
  | `electrical.chargers.${string}.temperature.warnLower`
  | `electrical.chargers.${string}.temperature.warnUpper`
  | `electrical.chargers.${string}.voltage`
  | `electrical.chargers.${string}.voltage.ripple`
  | `electrical.inverters.${string}`
  | `electrical.inverters.${string}.ac`
  | `electrical.inverters.${string}.ac.apparentPower`
  | `electrical.inverters.${string}.ac.associatedBus`
  | `electrical.inverters.${string}.ac.current`
  | `electrical.inverters.${string}.ac.frequency`
  | `electrical.inverters.${string}.ac.lineLineVoltage`
  | `electrical.inverters.${string}.ac.lineNeutralVoltage`
  | `electrical.inverters.${string}.ac.powerFactor`
  | `electrical.inverters.${string}.ac.powerFactorLagging`
  | `electrical.inverters.${string}.ac.reactivePower`
  | `electrical.inverters.${string}.ac.realPower`
  | `electrical.inverters.${string}.dateInstalled`
  | `electrical.inverters.${string}.dc`
  | `electrical.inverters.${string}.dc.associatedBus`
  | `electrical.inverters.${string}.dc.current`
  | `electrical.inverters.${string}.dc.temperature`
  | `electrical.inverters.${string}.dc.temperature.faultLower`
  | `electrical.inverters.${string}.dc.temperature.faultUpper`
  | `electrical.inverters.${string}.dc.temperature.warnLower`
  | `electrical.inverters.${string}.dc.temperature.warnUpper`
  | `electrical.inverters.${string}.dc.voltage`
  | `electrical.inverters.${string}.dc.voltage.ripple`
  | `electrical.inverters.${string}.inverterMode`
  | `electrical.inverters.${string}.location`
  | `electrical.inverters.${string}.manufacturer`
  | `electrical.inverters.${string}.manufacturer.URL`
  | `electrical.inverters.${string}.manufacturer.model`
  | `electrical.inverters.${string}.manufacturer.name`
  | `electrical.inverters.${string}.name`
  | `electrical.solar.${string}`
  | `electrical.solar.${string}.associatedBus`
  | `electrical.solar.${string}.chargerRole`
  | `electrical.solar.${string}.chargingAlgorithm`
  | `electrical.solar.${string}.chargingMode`
  | `electrical.solar.${string}.controllerMode`
  | `electrical.solar.${string}.current`
  | `electrical.solar.${string}.dateInstalled`
  | `electrical.solar.${string}.load`
  | `electrical.solar.${string}.loadCurrent`
  | `electrical.solar.${string}.location`
  | `electrical.solar.${string}.manufacturer`
  | `electrical.solar.${string}.manufacturer.URL`
  | `electrical.solar.${string}.manufacturer.model`
  | `electrical.solar.${string}.manufacturer.name`
  | `electrical.solar.${string}.name`
  | `electrical.solar.${string}.panelCurrent`
  | `electrical.solar.${string}.panelPower`
  | `electrical.solar.${string}.panelTemperature`
  | `electrical.solar.${string}.panelVoltage`
  | `electrical.solar.${string}.setpointCurrent`
  | `electrical.solar.${string}.setpointVoltage`
  | `electrical.solar.${string}.temperature`
  | `electrical.solar.${string}.temperature.faultLower`
  | `electrical.solar.${string}.temperature.faultUpper`
  | `electrical.solar.${string}.temperature.warnLower`
  | `electrical.solar.${string}.temperature.warnUpper`
  | `electrical.solar.${string}.voltage`
  | `electrical.solar.${string}.voltage.ripple`
  | `electrical.solar.${string}.yieldToday`
  | `notifications.${string}`
  | `performance.polars.${string}`
  | `performance.polars.${string}.description`
  | `performance.polars.${string}.id`
  | `performance.polars.${string}.name`
  | `performance.polars.${string}.windData`
  | `propulsion.${string}`
  | `propulsion.${string}.alternatorVoltage`
  | `propulsion.${string}.boostPressure`
  | `propulsion.${string}.coolantPressure`
  | `propulsion.${string}.coolantTemperature`
  | `propulsion.${string}.drive`
  | `propulsion.${string}.drive.propeller`
  | `propulsion.${string}.drive.thrustAngle`
  | `propulsion.${string}.drive.trimState`
  | `propulsion.${string}.drive.type`
  | `propulsion.${string}.engineLoad`
  | `propulsion.${string}.engineTorque`
  | `propulsion.${string}.exhaustTemperature`
  | `propulsion.${string}.fuel`
  | `propulsion.${string}.fuel.averageRate`
  | `propulsion.${string}.fuel.economyRate`
  | `propulsion.${string}.fuel.pressure`
  | `propulsion.${string}.fuel.rate`
  | `propulsion.${string}.fuel.type`
  | `propulsion.${string}.fuel.used`
  | `propulsion.${string}.intakeManifoldTemperature`
  | `propulsion.${string}.label`
  | `propulsion.${string}.oilPressure`
  | `propulsion.${string}.oilTemperature`
  | `propulsion.${string}.revolutions`
  | `propulsion.${string}.runTime`
  | `propulsion.${string}.state`
  | `propulsion.${string}.temperature`
  | `propulsion.${string}.transmission`
  | `propulsion.${string}.transmission.gear`
  | `propulsion.${string}.transmission.gearRatio`
  | `propulsion.${string}.transmission.oilPressure`
  | `propulsion.${string}.transmission.oilTemperature`
  | `registrations.local.${string}`
  | `registrations.local.${string}.description`
  | `registrations.local.${string}.registration`
  | `registrations.national.${string}`
  | `registrations.national.${string}.country`
  | `registrations.national.${string}.description`
  | `registrations.national.${string}.registration`
  | `registrations.other.${string}`
  | `registrations.other.${string}.description`
  | `registrations.other.${string}.registration`
  | `sails.inventory.${string}`
  | `sails.inventory.${string}.active`
  | `sails.inventory.${string}.area`
  | `sails.inventory.${string}.brand`
  | `sails.inventory.${string}.material`
  | `sails.inventory.${string}.maximumWind`
  | `sails.inventory.${string}.minimumWind`
  | `sails.inventory.${string}.name`
  | `sails.inventory.${string}.reducedState`
  | `sails.inventory.${string}.reducedState.furledRatio`
  | `sails.inventory.${string}.reducedState.reduced`
  | `sails.inventory.${string}.reducedState.reefs`
  | `sails.inventory.${string}.type`
  | `sensors.${string}`
  | `sensors.${string}.class`
  | `sensors.${string}.fromBow`
  | `sensors.${string}.fromCenter`
  | `sensors.${string}.name`
  | `sensors.${string}.sensorData`
  | `sensors.${string}.sensorType`
  | `tanks.baitWell.${string}`
  | `tanks.baitWell.${string}.capacity`
  | `tanks.baitWell.${string}.currentLevel`
  | `tanks.baitWell.${string}.currentVolume`
  | `tanks.baitWell.${string}.extinguishant`
  | `tanks.baitWell.${string}.name`
  | `tanks.baitWell.${string}.pressure`
  | `tanks.baitWell.${string}.temperature`
  | `tanks.baitWell.${string}.type`
  | `tanks.baitWell.${string}.viscosity`
  | `tanks.ballast.${string}`
  | `tanks.ballast.${string}.capacity`
  | `tanks.ballast.${string}.currentLevel`
  | `tanks.ballast.${string}.currentVolume`
  | `tanks.ballast.${string}.extinguishant`
  | `tanks.ballast.${string}.name`
  | `tanks.ballast.${string}.pressure`
  | `tanks.ballast.${string}.temperature`
  | `tanks.ballast.${string}.type`
  | `tanks.ballast.${string}.viscosity`
  | `tanks.blackWater.${string}`
  | `tanks.blackWater.${string}.capacity`
  | `tanks.blackWater.${string}.currentLevel`
  | `tanks.blackWater.${string}.currentVolume`
  | `tanks.blackWater.${string}.extinguishant`
  | `tanks.blackWater.${string}.name`
  | `tanks.blackWater.${string}.pressure`
  | `tanks.blackWater.${string}.temperature`
  | `tanks.blackWater.${string}.type`
  | `tanks.blackWater.${string}.viscosity`
  | `tanks.freshWater.${string}`
  | `tanks.freshWater.${string}.capacity`
  | `tanks.freshWater.${string}.currentLevel`
  | `tanks.freshWater.${string}.currentVolume`
  | `tanks.freshWater.${string}.extinguishant`
  | `tanks.freshWater.${string}.name`
  | `tanks.freshWater.${string}.pressure`
  | `tanks.freshWater.${string}.temperature`
  | `tanks.freshWater.${string}.type`
  | `tanks.freshWater.${string}.viscosity`
  | `tanks.fuel.${string}`
  | `tanks.fuel.${string}.capacity`
  | `tanks.fuel.${string}.currentLevel`
  | `tanks.fuel.${string}.currentVolume`
  | `tanks.fuel.${string}.extinguishant`
  | `tanks.fuel.${string}.name`
  | `tanks.fuel.${string}.pressure`
  | `tanks.fuel.${string}.temperature`
  | `tanks.fuel.${string}.type`
  | `tanks.fuel.${string}.viscosity`
  | `tanks.gas.${string}`
  | `tanks.gas.${string}.capacity`
  | `tanks.gas.${string}.currentLevel`
  | `tanks.gas.${string}.currentVolume`
  | `tanks.gas.${string}.extinguishant`
  | `tanks.gas.${string}.name`
  | `tanks.gas.${string}.pressure`
  | `tanks.gas.${string}.temperature`
  | `tanks.gas.${string}.type`
  | `tanks.gas.${string}.viscosity`
  | `tanks.liveWell.${string}`
  | `tanks.liveWell.${string}.capacity`
  | `tanks.liveWell.${string}.currentLevel`
  | `tanks.liveWell.${string}.currentVolume`
  | `tanks.liveWell.${string}.extinguishant`
  | `tanks.liveWell.${string}.name`
  | `tanks.liveWell.${string}.pressure`
  | `tanks.liveWell.${string}.temperature`
  | `tanks.liveWell.${string}.type`
  | `tanks.liveWell.${string}.viscosity`
  | `tanks.lubrication.${string}`
  | `tanks.lubrication.${string}.capacity`
  | `tanks.lubrication.${string}.currentLevel`
  | `tanks.lubrication.${string}.currentVolume`
  | `tanks.lubrication.${string}.extinguishant`
  | `tanks.lubrication.${string}.name`
  | `tanks.lubrication.${string}.pressure`
  | `tanks.lubrication.${string}.temperature`
  | `tanks.lubrication.${string}.type`
  | `tanks.lubrication.${string}.viscosity`
  | `tanks.wasteWater.${string}`
  | `tanks.wasteWater.${string}.capacity`
  | `tanks.wasteWater.${string}.currentLevel`
  | `tanks.wasteWater.${string}.currentVolume`
  | `tanks.wasteWater.${string}.extinguishant`
  | `tanks.wasteWater.${string}.name`
  | `tanks.wasteWater.${string}.pressure`
  | `tanks.wasteWater.${string}.temperature`
  | `tanks.wasteWater.${string}.type`
  | `tanks.wasteWater.${string}.viscosity`;

export type KnownPath = LiteralKnownPath | TemplateKnownPath;

// ---- PathValueOf<P> ----
//
// Maps a known Signal K path to its expected leaf value shape. Paths
// not covered (or with heterogeneous shapes) resolve to `unknown`, so
// callers always have a usable type and a narrowing point.

export type PathValueOf<P extends string> =
  P extends 'design.airHeight' ? number :
  P extends 'design.beam' ? number :
  P extends 'design.displacement' ? number :
  P extends 'design.keel.angle' ? number :
  P extends 'design.keel.lift' ? number :
  P extends `electrical.alternators.${string}.current` ? number :
  P extends `electrical.alternators.${string}.fieldDrive` ? number :
  P extends `electrical.alternators.${string}.pulleyRatio` ? number :
  P extends `electrical.alternators.${string}.regulatorTemperature` ? number :
  P extends `electrical.alternators.${string}.revolutions` ? number :
  P extends `electrical.alternators.${string}.setpointCurrent` ? number :
  P extends `electrical.alternators.${string}.setpointVoltage` ? number :
  P extends `electrical.alternators.${string}.temperature` ? number :
  P extends `electrical.alternators.${string}.voltage` ? number :
  P extends `electrical.alternators.${string}.voltage.ripple` ? number :
  P extends `electrical.batteries.${string}.capacity.dischargeSinceFull` ? number :
  P extends `electrical.batteries.${string}.capacity.stateOfCharge` ? number :
  P extends `electrical.batteries.${string}.capacity.stateOfHealth` ? number :
  P extends `electrical.batteries.${string}.capacity.timeRemaining` ? number :
  P extends `electrical.batteries.${string}.current` ? number :
  P extends `electrical.batteries.${string}.temperature` ? number :
  P extends `electrical.batteries.${string}.voltage` ? number :
  P extends `electrical.batteries.${string}.voltage.ripple` ? number :
  P extends `electrical.chargers.${string}.current` ? number :
  P extends `electrical.chargers.${string}.setpointCurrent` ? number :
  P extends `electrical.chargers.${string}.setpointVoltage` ? number :
  P extends `electrical.chargers.${string}.temperature` ? number :
  P extends `electrical.chargers.${string}.voltage` ? number :
  P extends `electrical.chargers.${string}.voltage.ripple` ? number :
  P extends `electrical.inverters.${string}.ac.apparentPower` ? number :
  P extends `electrical.inverters.${string}.ac.current` ? number :
  P extends `electrical.inverters.${string}.ac.frequency` ? number :
  P extends `electrical.inverters.${string}.ac.lineLineVoltage` ? number :
  P extends `electrical.inverters.${string}.ac.lineNeutralVoltage` ? number :
  P extends `electrical.inverters.${string}.ac.powerFactor` ? number :
  P extends `electrical.inverters.${string}.ac.reactivePower` ? number :
  P extends `electrical.inverters.${string}.ac.realPower` ? number :
  P extends `electrical.inverters.${string}.dc.current` ? number :
  P extends `electrical.inverters.${string}.dc.temperature` ? number :
  P extends `electrical.inverters.${string}.dc.voltage` ? number :
  P extends `electrical.inverters.${string}.dc.voltage.ripple` ? number :
  P extends `electrical.solar.${string}.current` ? number :
  P extends `electrical.solar.${string}.loadCurrent` ? number :
  P extends `electrical.solar.${string}.panelCurrent` ? number :
  P extends `electrical.solar.${string}.panelPower` ? number :
  P extends `electrical.solar.${string}.panelTemperature` ? number :
  P extends `electrical.solar.${string}.panelVoltage` ? number :
  P extends `electrical.solar.${string}.setpointCurrent` ? number :
  P extends `electrical.solar.${string}.setpointVoltage` ? number :
  P extends `electrical.solar.${string}.temperature` ? number :
  P extends `electrical.solar.${string}.voltage` ? number :
  P extends `electrical.solar.${string}.voltage.ripple` ? number :
  P extends `electrical.solar.${string}.yieldToday` ? number :
  P extends 'environment.depth.belowKeel' ? number :
  P extends 'environment.depth.belowSurface' ? number :
  P extends 'environment.depth.belowTransducer' ? number :
  P extends 'environment.depth.surfaceToTransducer' ? number :
  P extends 'environment.depth.transducerToKeel' ? number :
  P extends 'environment.heave' ? number :
  P extends 'environment.inside.airDensity' ? number :
  P extends 'environment.inside.dewPoint' ? number :
  P extends 'environment.inside.dewPointTemperature' ? number :
  P extends 'environment.inside.heatIndexTemperature' ? number :
  P extends 'environment.inside.illuminance' ? number :
  P extends 'environment.inside.pressure' ? number :
  P extends 'environment.inside.relativeHumidity' ? number :
  P extends 'environment.inside.temperature' ? number :
  P extends 'environment.outside.airDensity' ? number :
  P extends 'environment.outside.apparentWindChillTemperature' ? number :
  P extends 'environment.outside.dewPointTemperature' ? number :
  P extends 'environment.outside.heatIndexTemperature' ? number :
  P extends 'environment.outside.humidity' ? number :
  P extends 'environment.outside.illuminance' ? number :
  P extends 'environment.outside.pressure' ? number :
  P extends 'environment.outside.relativeHumidity' ? number :
  P extends 'environment.outside.temperature' ? number :
  P extends 'environment.outside.theoreticalWindChillTemperature' ? number :
  P extends 'environment.tide.heightHigh' ? number :
  P extends 'environment.tide.heightLow' ? number :
  P extends 'environment.tide.heightNow' ? number :
  P extends 'environment.water.salinity' ? number :
  P extends 'environment.water.temperature' ? number :
  P extends 'environment.wind.angleApparent' ? number :
  P extends 'environment.wind.angleTrueGround' ? number :
  P extends 'environment.wind.angleTrueWater' ? number :
  P extends 'environment.wind.directionChangeAlarm' ? number :
  P extends 'environment.wind.directionMagnetic' ? number :
  P extends 'environment.wind.directionTrue' ? number :
  P extends 'environment.wind.speedApparent' ? number :
  P extends 'environment.wind.speedOverGround' ? number :
  P extends 'environment.wind.speedTrue' ? number :
  P extends 'navigation.anchor.currentRadius' ? number :
  P extends 'navigation.anchor.maxRadius' ? number :
  P extends 'navigation.anchor.position' ? PositionValue :
  P extends 'navigation.courseGreatCircle.activeRoute.estimatedTimeOfArrival' ? string :
  P extends 'navigation.courseGreatCircle.activeRoute.startTime' ? string :
  P extends 'navigation.courseGreatCircle.bearingTrackMagnetic' ? number :
  P extends 'navigation.courseGreatCircle.bearingTrackTrue' ? number :
  P extends 'navigation.courseGreatCircle.crossTrackError' ? number :
  P extends 'navigation.courseGreatCircle.previousPoint.distance' ? number :
  P extends 'navigation.courseGreatCircle.previousPoint.position' ? PositionValue :
  P extends 'navigation.courseOverGroundMagnetic' ? number :
  P extends 'navigation.courseOverGroundTrue' ? number :
  P extends 'navigation.courseRhumbline.activeRoute.estimatedTimeOfArrival' ? string :
  P extends 'navigation.courseRhumbline.activeRoute.startTime' ? string :
  P extends 'navigation.courseRhumbline.bearingTrackMagnetic' ? number :
  P extends 'navigation.courseRhumbline.bearingTrackTrue' ? number :
  P extends 'navigation.courseRhumbline.crossTrackError' ? number :
  P extends 'navigation.courseRhumbline.previousPoint.distance' ? number :
  P extends 'navigation.courseRhumbline.previousPoint.position' ? PositionValue :
  P extends 'navigation.destination.commonName' ? string :
  P extends 'navigation.destination.eta' ? string :
  P extends 'navigation.destination.waypoint' ? string :
  P extends 'navigation.gnss.antennaAltitude' ? number :
  P extends 'navigation.gnss.differentialAge' ? number :
  P extends 'navigation.gnss.differentialReference' ? number :
  P extends 'navigation.gnss.geoidalSeparation' ? number :
  P extends 'navigation.gnss.horizontalDilution' ? number :
  P extends 'navigation.gnss.positionDilution' ? number :
  P extends 'navigation.gnss.satellites' ? number :
  P extends 'navigation.headingCompass' ? number :
  P extends 'navigation.headingMagnetic' ? number :
  P extends 'navigation.headingTrue' ? number :
  P extends 'navigation.leewayAngle' ? number :
  P extends 'navigation.log' ? number :
  P extends 'navigation.magneticDeviation' ? number :
  P extends 'navigation.magneticVariation' ? number :
  P extends 'navigation.magneticVariationAgeOfService' ? number :
  P extends 'navigation.position' ? PositionValue :
  P extends 'navigation.racing.distanceStartline' ? number :
  P extends 'navigation.racing.layline.distance' ? number :
  P extends 'navigation.racing.layline.time' ? number :
  P extends 'navigation.racing.oppositeLayline.distance' ? number :
  P extends 'navigation.racing.oppositeLayline.time' ? number :
  P extends 'navigation.racing.startLinePort' ? PositionValue :
  P extends 'navigation.racing.startLineStb' ? PositionValue :
  P extends 'navigation.racing.timePortDown' ? number :
  P extends 'navigation.racing.timePortUp' ? number :
  P extends 'navigation.racing.timeStbdDown' ? number :
  P extends 'navigation.racing.timeStbdUp' ? number :
  P extends 'navigation.racing.timeToStart' ? number :
  P extends 'navigation.rateOfTurn' ? number :
  P extends 'navigation.speedOverGround' ? number :
  P extends 'navigation.speedThroughWater' ? number :
  P extends 'navigation.speedThroughWaterLongitudinal' ? number :
  P extends 'navigation.speedThroughWaterTransverse' ? number :
  P extends 'navigation.trip.lastReset' ? string :
  P extends 'navigation.trip.log' ? number :
  P extends 'performance.beatAngle' ? number :
  P extends 'performance.beatAngleTargetSpeed' ? number :
  P extends 'performance.beatAngleVelocityMadeGood' ? number :
  P extends 'performance.gybeAngle' ? number :
  P extends 'performance.gybeAngleTargetSpeed' ? number :
  P extends 'performance.gybeAngleVelocityMadeGood' ? number :
  P extends 'performance.leeway' ? number :
  P extends 'performance.polarSpeed' ? number :
  P extends 'performance.polarSpeedRatio' ? number :
  P extends 'performance.tackMagnetic' ? number :
  P extends 'performance.tackTrue' ? number :
  P extends 'performance.targetAngle' ? number :
  P extends 'performance.targetSpeed' ? number :
  P extends 'performance.velocityMadeGood' ? number :
  P extends 'performance.velocityMadeGoodToWaypoint' ? number :
  P extends `propulsion.${string}.alternatorVoltage` ? number :
  P extends `propulsion.${string}.boostPressure` ? number :
  P extends `propulsion.${string}.coolantPressure` ? number :
  P extends `propulsion.${string}.coolantTemperature` ? number :
  P extends `propulsion.${string}.drive.thrustAngle` ? number :
  P extends `propulsion.${string}.drive.trimState` ? number :
  P extends `propulsion.${string}.engineLoad` ? number :
  P extends `propulsion.${string}.engineTorque` ? number :
  P extends `propulsion.${string}.exhaustTemperature` ? number :
  P extends `propulsion.${string}.fuel.averageRate` ? number :
  P extends `propulsion.${string}.fuel.economyRate` ? number :
  P extends `propulsion.${string}.fuel.pressure` ? number :
  P extends `propulsion.${string}.fuel.rate` ? number :
  P extends `propulsion.${string}.fuel.used` ? number :
  P extends `propulsion.${string}.intakeManifoldTemperature` ? number :
  P extends `propulsion.${string}.oilPressure` ? number :
  P extends `propulsion.${string}.oilTemperature` ? number :
  P extends `propulsion.${string}.revolutions` ? number :
  P extends `propulsion.${string}.runTime` ? number :
  P extends `propulsion.${string}.temperature` ? number :
  P extends `propulsion.${string}.transmission.gearRatio` ? number :
  P extends `propulsion.${string}.transmission.oilPressure` ? number :
  P extends `propulsion.${string}.transmission.oilTemperature` ? number :
  P extends 'sails.area.active' ? number :
  P extends 'sails.area.total' ? number :
  P extends 'steering.autopilot.backlash' ? number :
  P extends 'steering.autopilot.deadZone' ? number :
  P extends 'steering.autopilot.gain' ? number :
  P extends 'steering.autopilot.maxDriveCurrent' ? number :
  P extends 'steering.autopilot.maxDriveRate' ? number :
  P extends 'steering.autopilot.portLock' ? number :
  P extends 'steering.autopilot.starboardLock' ? number :
  P extends 'steering.autopilot.target.headingMagnetic' ? number :
  P extends 'steering.autopilot.target.headingTrue' ? number :
  P extends 'steering.autopilot.target.windAngleApparent' ? number :
  P extends 'steering.autopilot.target.windAngleTrue' ? number :
  P extends 'steering.rudderAngle' ? number :
  P extends 'steering.rudderAngleTarget' ? number :
  P extends `tanks.baitWell.${string}.capacity` ? number :
  P extends `tanks.baitWell.${string}.currentLevel` ? number :
  P extends `tanks.baitWell.${string}.currentVolume` ? number :
  P extends `tanks.baitWell.${string}.extinguishant` ? string :
  P extends `tanks.baitWell.${string}.pressure` ? number :
  P extends `tanks.baitWell.${string}.temperature` ? number :
  P extends `tanks.baitWell.${string}.viscosity` ? number :
  P extends `tanks.ballast.${string}.capacity` ? number :
  P extends `tanks.ballast.${string}.currentLevel` ? number :
  P extends `tanks.ballast.${string}.currentVolume` ? number :
  P extends `tanks.ballast.${string}.extinguishant` ? string :
  P extends `tanks.ballast.${string}.pressure` ? number :
  P extends `tanks.ballast.${string}.temperature` ? number :
  P extends `tanks.ballast.${string}.viscosity` ? number :
  P extends `tanks.blackWater.${string}.capacity` ? number :
  P extends `tanks.blackWater.${string}.currentLevel` ? number :
  P extends `tanks.blackWater.${string}.currentVolume` ? number :
  P extends `tanks.blackWater.${string}.extinguishant` ? string :
  P extends `tanks.blackWater.${string}.pressure` ? number :
  P extends `tanks.blackWater.${string}.temperature` ? number :
  P extends `tanks.blackWater.${string}.viscosity` ? number :
  P extends `tanks.freshWater.${string}.capacity` ? number :
  P extends `tanks.freshWater.${string}.currentLevel` ? number :
  P extends `tanks.freshWater.${string}.currentVolume` ? number :
  P extends `tanks.freshWater.${string}.extinguishant` ? string :
  P extends `tanks.freshWater.${string}.pressure` ? number :
  P extends `tanks.freshWater.${string}.temperature` ? number :
  P extends `tanks.freshWater.${string}.viscosity` ? number :
  P extends `tanks.fuel.${string}.capacity` ? number :
  P extends `tanks.fuel.${string}.currentLevel` ? number :
  P extends `tanks.fuel.${string}.currentVolume` ? number :
  P extends `tanks.fuel.${string}.extinguishant` ? string :
  P extends `tanks.fuel.${string}.pressure` ? number :
  P extends `tanks.fuel.${string}.temperature` ? number :
  P extends `tanks.fuel.${string}.viscosity` ? number :
  P extends `tanks.gas.${string}.capacity` ? number :
  P extends `tanks.gas.${string}.currentLevel` ? number :
  P extends `tanks.gas.${string}.currentVolume` ? number :
  P extends `tanks.gas.${string}.extinguishant` ? string :
  P extends `tanks.gas.${string}.pressure` ? number :
  P extends `tanks.gas.${string}.temperature` ? number :
  P extends `tanks.gas.${string}.viscosity` ? number :
  P extends `tanks.liveWell.${string}.capacity` ? number :
  P extends `tanks.liveWell.${string}.currentLevel` ? number :
  P extends `tanks.liveWell.${string}.currentVolume` ? number :
  P extends `tanks.liveWell.${string}.extinguishant` ? string :
  P extends `tanks.liveWell.${string}.pressure` ? number :
  P extends `tanks.liveWell.${string}.temperature` ? number :
  P extends `tanks.liveWell.${string}.viscosity` ? number :
  P extends `tanks.lubrication.${string}.capacity` ? number :
  P extends `tanks.lubrication.${string}.currentLevel` ? number :
  P extends `tanks.lubrication.${string}.currentVolume` ? number :
  P extends `tanks.lubrication.${string}.extinguishant` ? string :
  P extends `tanks.lubrication.${string}.pressure` ? number :
  P extends `tanks.lubrication.${string}.temperature` ? number :
  P extends `tanks.lubrication.${string}.viscosity` ? number :
  P extends `tanks.wasteWater.${string}.capacity` ? number :
  P extends `tanks.wasteWater.${string}.currentLevel` ? number :
  P extends `tanks.wasteWater.${string}.currentVolume` ? number :
  P extends `tanks.wasteWater.${string}.extinguishant` ? string :
  P extends `tanks.wasteWater.${string}.pressure` ? number :
  P extends `tanks.wasteWater.${string}.temperature` ? number :
  P extends `tanks.wasteWater.${string}.viscosity` ? number :
  unknown;
