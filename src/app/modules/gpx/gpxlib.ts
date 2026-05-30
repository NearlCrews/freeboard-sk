import { xml2JsonInWorker } from 'src/app/lib/file-xml2json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Extensions = Record<string, any>;

export class GPX {
  private version = '1.1';
  public creator = '@panaaj';

  public wpt: GPXWaypoint[] = [];
  public rte: GPXRoute[] = [];
  public trk: GPXTrack[] = [];
  public extensions: Extensions = {};
  public metadata: GPXMetadataType = new GPXMetadataType();

  constructor() {
    this.init();
  }

  public init() {
    this.version = '1.1';
    this.creator = '@panaaj';
    this.wpt = [];
    this.rte = [];
    this.trk = [];
    this.extensions = {};
    this.metadata = new GPXMetadataType();
  }

  public stringify() {
    return this.toXML();
  }

  public toXML() {
    let xml =
      `<?xml version="1.0" encoding="UTF-8"?>\r\n` +
      `<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
      `version="${this.version}" ` +
      `xmlns="http://www.topografix.com/GPX/1/1" ` +
      `creator="${this.creator}" ` +
      `xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.topografix.com/GPX/Private/TopoGrafix/0/1 http://www.topografix.com/GPX/Private/TopoGrafix/0/1/topografix.xsd" ` +
      `xmlns:topografix="http://www.topografix.com/GPX/Private/TopoGrafix/0/1">\r\n` +
      this.metadataToXML() +
      this.waypointsToXML() +
      this.routesToXML() +
      this.tracksToXML();

    xml += this.extensionsToXML(this.extensions);
    xml += '</gpx>\r\n';
    return xml;
  }

  private metadataToXML() {
    let xml =
      `\t<metadata>\r\n` +
      `\t\t<name>${this.metadata.name || ''}</name>\r\n` +
      `\t\t<desc>${this.metadata.desc || ''}</desc>\r\n` +
      `\t\t<time>${this.metadata.time || ''}</time>\r\n`;
    xml += this.metadata.keywords
      ? `\t\t<keywords>${this.metadata.keywords || ''}</keywords>\r\n`
      : '';

    if (this.metadata.author) {
      xml +=
        `\t\t<author>\r\n` +
        `\t\t\t<name>${this.metadata.author.name || ''}</name>\r\n` +
        `\t\t\t<email>\r\n` +
        `\t\t\t\t<id>${this.metadata.author.email.id || ''}</id>\r\n` +
        `\t\t\t\t<domain>${
          this.metadata.author.email.domain || ''
        }</domain>\r\n` +
        `\t\t\t</email>\r\n` +
        `\t\t\t<link href="${this.metadata.author.link.href || ''}">\r\n` +
        `\t\t\t\t<text>${this.metadata.author.link.text || ''}</text>\r\n` +
        `\t\t\t\t<type>${this.metadata.author.link.type || ''}</type>\r\n` +
        `\t\t\t</link>\r\n` +
        `\t\t</author>\r\n`;
    }

    if (this.metadata.copyright) {
      xml +=
        `\t\t<copyright author="${this.metadata.copyright || ''}">\r\n` +
        `\t\t\t<year>${this.metadata.copyright.year || ''}</year>\r\n` +
        `\t\t\t<license>${
          this.metadata.copyright.license || ''
        }</license>\r\n` +
        `\t\t</copyright>\r\n`;
    }

    this.metadata.link.forEach((l) => {
      xml +=
        `\t\t<link href="${l.href || ''}">\r\n` +
        `\t\t\t<text>${l.text || ''}</text>\r\n` +
        `\t\t\t<type>${l.type || ''}</type>\r\n` +
        `\t\t</link>\r\n`;
    });

    xml +=
      `\t\t<bounds minlat="${this.metadata.bounds.minLat}" minlon="${this.metadata.bounds.minLon}" ` +
      `maxlat="${this.metadata.bounds.maxLat}" maxlon="${this.metadata.bounds.maxLon}">` +
      `</bounds>\r\n`;

    xml += this.extensionsToXML(this.metadata.extensions, 2);
    xml += `\t</metadata>\r\n`;

    return xml;
  }

  /** Returns a formatted wpt strings **/
  private waypointsToXML() {
    let xml = '';
    for (const pt of this.wpt) {
      xml += this.ptToXML(pt, 'wpt');
    }
    return xml;
  }

  /** Returns a formatted rte strings **/
  private routesToXML() {
    let xml = '';
    this.rte.forEach((rt) => {
      xml += `\t<rte>\r\n`;
      xml += rt.name ? `\t\t<name>${rt.name || ''}</name>\r\n` : '';
      xml += rt.cmt ? `\t\t<cmt>${rt.cmt || ''}</cmt>\r\n` : '';
      xml += rt.desc ? `\t\t<desc>${rt.desc || ''}</desc>\r\n` : '';
      xml += rt.src ? `\t\t<src>${rt.src || ''}</src>\r\n` : '';
      xml += rt.number ? `\t\t<number>${rt.number || ''}</number>\r\n` : '';
      xml += rt.type ? `\t\t<type>${rt.type || ''}</type>\r\n` : '';

      rt.link.forEach((l) => {
        xml +=
          `\t\t<link href="${l.href || ''}">\r\n` +
          `\t\t\t<text>${l.text || ''}</text>\r\n` +
          `\t\t\t<type>${l.type || ''}</type>\r\n` +
          `\t\t</link>\r\n`;
      });

      xml += this.extensionsToXML(rt.extensions, 2);

      for (const pt of rt.rtept) {
        xml += this.ptToXML(pt, 'rtept');
      }
      xml += `\t</rte>\r\n`;
    });
    return xml;
  }

  /** Returns a formatted trk strings **/
  private tracksToXML() {
    let xml = '';
    this.trk.forEach((tk) => {
      xml += '\t<trk>\r\n';
      xml += tk.name ? `\t\t<name>${tk.name || ''}</name>\r\n` : '';
      xml += tk.cmt ? `\t\t<cmt>${tk.cmt || ''}</cmt>\r\n` : '';
      xml += tk.desc ? `\t\t<desc>${tk.desc || ''}</desc>\r\n` : '';
      xml += tk.src ? `\t\t<src>${tk.src || ''}</src>\r\n` : '';
      xml += tk.number ? `\t\t<number>${tk.number || ''}</number>\r\n` : '';
      xml += tk.type ? `\t\t<type>${tk.type || ''}</type>\r\n` : '';

      xml += this.extensionsToXML(tk.extensions, 2);

      tk.trkseg.forEach((seg) => {
        xml += '\t\t<trkseg>\r\n';
        for (const pt of seg.trkpt) {
          xml += this.ptToXML(pt, 'trkpt');
        }
        xml += '\t\t</trkseg>\r\n';
      });
      xml += '\t</trk>\r\n';
    });
    return xml;
  }

  /** Return formatted ptType <tag> XML for supplied GPXWaypoint object **/
  private ptToXML(pt: GPXWaypoint, tag: 'wpt' | 'rtept' | 'trkpt') {
    let pad = '';
    let padLevel = 2;
    switch (tag) {
      case 'trkpt':
        pad = '\t\t';
        padLevel = 4;
        break;
      case 'rtept':
        pad = '\t';
        padLevel = 3;
        break;
    }
    let xml = '';

    xml += `${pad}\t<${tag} lat="${pt.lat.toFixed(6)}" lon="${pt.lon.toFixed(
      6
    )}">\r\n`;
    xml += pt.sym ? `${pad}\t\t<sym>${pt.sym || ''}</sym>\r\n` : '';
    xml += pt.name ? `${pad}\t\t<name>${pt.name || ''}</name>\r\n` : '';
    xml += pt.cmt ? `${pad}\t\t<cmt>${pt.cmt || ''}</cmt>\r\n` : '';
    xml += pt.desc ? `${pad}\t\t<desc>${pt.desc || ''}</desc>\r\n` : '';
    xml += pt.src ? `${pad}\t\t<src>${pt.src || ''}</src>\r\n` : '';
    xml += pt.type ? `${pad}\t\t<type>${pt.type || ''}</type>\r\n` : '';
    xml += pt.fix ? `${pad}\t\t<fix>${pt.fix || ''}</fix>\r\n` : '';

    xml += pt.ele ? `${pad}\t\t<ele>${pt.ele}</ele>\r\n` : '';
    xml += pt.magvar ? `${pad}\t\t<magvar>${pt.magvar}</magvar>\r\n` : '';
    xml += pt.geoidHeight
      ? `${pad}\t\t<geoidheight>${pt.geoidHeight}</geoidheight>\r\n`
      : '';
    xml += pt.sat ? `${pad}\t\t<sat>${pt.sat}</sat>\r\n` : '';
    xml += pt.vdop ? `${pad}\t\t<vdop>${pt.vdop}</vdop>\r\n` : '';
    xml += pt.hdop ? `${pad}\t\t<hdop>${pt.hdop}</hdop>\r\n` : '';
    xml += pt.pdop ? `${pad}\t\t<pdop>${pt.pdop}</pdop>\r\n` : '';
    xml += pt.ageOfGpsData
      ? `${pad}\t\t<ageofdgpsdata>${pt.ageOfGpsData}</ageofdgpsdata>\r\n`
      : '';
    xml += pt.dgpsid ? `${pad}\t\t<dgpsid>${pt.dgpsid}</dgpsid>\r\n` : '';

    pt.link.forEach((l) => {
      xml +=
        `${pad}\t\t<link href="${l.href || ''}">\r\n` +
        `${pad}\t\t\t<text>${l.text || ''}</text>\r\n` +
        `${pad}\t\t\t<type>${l.type || ''}</type>\r\n` +
        `${pad}\t\t</link>\r\n`;
    });

    xml += this.extensionsToXML(pt.extensions, padLevel);

    xml += `${pad}\t</${tag}>\r\n`;

    return xml;
  }

  private extensionsToXML(ext: Extensions, padLevel = 1) {
    let xml = '';
    if (ext && Object.keys(ext).length !== 0) {
      const pad = '\t\t\t\t\t\t\t\t\t'.slice(0 - padLevel);
      let es = ``;
      if (ext['signalk']) {
        const sk = ext['signalk'] as Record<string, unknown>;
        Object.keys(sk).forEach((k) => {
          es += `${pad}\t\t<${k}>${sk[k]}</${k}>\r\n`;
        });
      }
      xml +=
        `${pad}<extensions>\r\n${pad}\t<signalk>\r\n` +
        es +
        `${pad}\t</signalk>\r\n${pad}</extensions>\r\n`;
    }
    return xml;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private xValue(attrib: any): any {
    if (attrib && Array.isArray(attrib)) {
      return attrib.length !== 0 ? attrib[0] : null;
    }
    return undefined;
  }

  public async parse(gpxstr: string): Promise<boolean> {
    if (!gpxstr || !gpxstr.includes('<gpx')) {
      return false;
    }
    this.init();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const xjs = (await xml2JsonInWorker(gpxstr)) as any;
      const gpxNode = xjs?.gpx;
      if (!gpxNode) {
        return false;
      }

      if (gpxNode.metadata) {
        const meta = this.xValue(gpxNode.metadata);

        this.metadata.name = meta.name ? this.xValue(meta.name) : '';
        this.metadata.desc = meta.desc ? this.xValue(meta.desc) : '';
        this.metadata.keywords = meta.keywords ? meta.keywords : '';

        if (meta.bounds) {
          const bounds = this.xValue(meta.bounds);
          this.metadata.bounds.minLat = Number(bounds.$.minlat);
          this.metadata.bounds.minLon = Number(bounds.$.minlon);
          this.metadata.bounds.maxLat = Number(bounds.$.maxlat);
          this.metadata.bounds.maxLon = Number(bounds.$.maxlon);
        }
        this.metadata.extensions = meta.extensions
          ? this.parseExtensions(meta.extensions)
          : {};
      }

      if (gpxNode.wpt) {
        this.parseWaypoints(gpxNode.wpt);
      }
      if (gpxNode.rte) {
        this.parseRoutes(gpxNode.rte);
      }
      if (gpxNode.trk) {
        this.parseTracks(gpxNode.trk);
      }
      this.extensions = gpxNode.extensions
        ? this.parseExtensions(gpxNode.extensions)
        : {};
      return true;
    } catch {
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseWaypoints(waypoints: any) {
    if (Array.isArray(waypoints)) {
      waypoints.forEach((w) => {
        const pt = this.toWpt(w);
        this.updateBounds(pt);
        this.wpt.push(pt);
      });
    } else {
      const pt = this.toWpt(waypoints);
      this.updateBounds(pt);
      this.wpt.push(pt);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseRoutes(routes: any) {
    if (Array.isArray(routes)) {
      routes.forEach((r) => {
        const rte = this.toRte(r);
        this.rte.push(rte);
      });
    } else {
      const rte = this.toRte(routes);
      this.rte.push(rte);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseTracks(tracks: any) {
    if (Array.isArray(tracks)) {
      tracks.forEach((t) => {
        const trk = this.toTrk(t);
        this.trk.push(trk);
      });
    } else {
      const trk = this.toTrk(tracks);
      this.trk.push(trk);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseExtensions(xext: any): Extensions {
    if (!xext) {
      return {};
    }
    if (!Array.isArray(xext)) {
      return {};
    }
    const resExt: Extensions = {};
    xext.forEach((i) => {
      if (i.signalk) {
        const res: Record<string, unknown> = {};
        const sk = this.xValue(i.signalk);
        Object.keys(sk).forEach((k) => {
          res[k] = this.xValue(sk[k]);
        });
        resExt['signalk'] = res;
      }
    });
    return resExt;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseLinks(xlink: any): GPXLinkType[] {
    const links: GPXLinkType[] = [];
    if (!xlink) {
      return links;
    }

    if (Array.isArray(xlink)) {
      xlink.forEach((link) => {
        const l = new GPXLinkType();
        l.href = link._href;
        l.text = link.text;
        l.type = link.type;
        links.push(l);
      });
    } else {
      const l = new GPXLinkType();
      l.href = xlink._href;
      l.text = xlink.text;
      l.type = xlink.type;
      links.push(l);
    }
    return links;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toRte(xmlrte: any): GPXRoute {
    const rte = new GPXRoute();

    rte.name = xmlrte.name ? this.xValue(xmlrte.name) : null;
    rte.cmt = xmlrte.cmt ? this.xValue(xmlrte.cmt) : null;
    rte.desc = xmlrte.desc ? this.xValue(xmlrte.desc) : null;
    rte.src = xmlrte.src ? this.xValue(xmlrte.src) : null;

    rte.extensions = xmlrte.extensions
      ? this.parseExtensions(xmlrte.extensions)
      : {};

    if (xmlrte.rtept) {
      rte.rtept = this.toPtArray(xmlrte.rtept);
    }

    return rte;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toWpt(xmlwpt: any): GPXWaypoint {
    const pt = new GPXWaypoint();
    pt.lat = Number(xmlwpt.$.lat) || 0;
    pt.lon = Number(xmlwpt.$.lon) || 0;
    pt.ele = xmlwpt.ele ? Number(this.xValue(xmlwpt.ele)) : null;

    pt.sym = xmlwpt.sym ? this.xValue(xmlwpt.sym) : null;
    pt.name = xmlwpt.name ? this.xValue(xmlwpt.name) : null;
    pt.cmt = xmlwpt.cmt ? this.xValue(xmlwpt.cmt) : null;
    pt.desc = xmlwpt.desc ? this.xValue(xmlwpt.desc) : null;
    pt.src = xmlwpt.src ? this.xValue(xmlwpt.src) : null;
    pt.type = xmlwpt.type ? this.xValue(xmlwpt.type) : null;

    pt.extensions = xmlwpt.extensions
      ? this.parseExtensions(xmlwpt.extensions)
      : {};

    return pt;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toTrk(xmltrk: any): GPXTrack {
    const tk = new GPXTrack();

    tk.name = xmltrk.name ? this.xValue(xmltrk.name) : null;
    tk.cmt = xmltrk.cmt ? this.xValue(xmltrk.cmt) : null;
    tk.desc = xmltrk.desc ? this.xValue(xmltrk.desc) : null;
    tk.src = xmltrk.src ? this.xValue(xmltrk.src) : null;
    tk.number = xmltrk.number ? Number(this.xValue(xmltrk.number)) : null;
    tk.type = xmltrk.type ? this.xValue(xmltrk.type) : null;
    tk.extensions = xmltrk.extensions
      ? this.parseExtensions(xmltrk.extensions)
      : {};

    if (xmltrk.trkseg) {
      if (Array.isArray(xmltrk.trkseg)) {
        xmltrk.trkseg.forEach(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (trkseg: any) => {
            const seg = new GPXTrackSegment();
            seg.extensions = trkseg.extensions
              ? this.parseExtensions(trkseg.extensions)
              : {};
            if (trkseg.trkpt) {
              seg.trkpt = this.toPtArray(trkseg.trkpt);
            }
            tk.trkseg.push(seg);
          }
        );
      } else {
        const seg = new GPXTrackSegment();
        seg.extensions = xmltrk.trkseg.extensions
          ? this.parseExtensions(xmltrk.trkseg.extensions)
          : {};
        if (xmltrk.trkseg.trkpt) {
          seg.trkpt = this.toPtArray(xmltrk.trkseg.trkpt);
        }
        tk.trkseg.push(seg);
      }
    }
    return tk;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPtArray(xpts: any): GPXWaypoint[] {
    const pts: GPXWaypoint[] = [];
    if (Array.isArray(xpts)) {
      xpts.forEach((t) => {
        const pt = this.toWpt(t);
        this.updateBounds(pt);
        pts.push(pt);
      });
    } else {
      const pt = this.toWpt(xpts);
      this.updateBounds(pt);
      pts.push(pt);
    }
    return pts;
  }

  /**
   * add extension to element
   * @param ele: element to add <extension> to
   * @param name: extension path/name in dotted notation e.g. signalk.uuid
   * @param value: extension value
   **/
  private setExtension(
    ele: { extensions?: Extensions },
    name: string,
    value: unknown
  ) {
    const ext: Extensions = ele.extensions ?? {};
    ele.extensions = ext;
    const ns = name.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let p: any = ext;
    ns.forEach((n) => {
      if (!p[n]) {
        p[n] = {};
      }
      p = p[n];
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signalk: Record<string, any> = ext['signalk'] ?? {};
    ext['signalk'] = signalk;
    signalk['uuid'] = value;
  }

  public updateBounds(pt: { lat: number; lon: number }) {
    this.metadata.bounds.minLat =
      pt.lat < this.metadata.bounds.minLat
        ? pt.lat
        : this.metadata.bounds.minLat;
    this.metadata.bounds.minLon =
      pt.lon < this.metadata.bounds.minLon
        ? pt.lon
        : this.metadata.bounds.minLon;
    this.metadata.bounds.maxLat =
      pt.lat > this.metadata.bounds.maxLat
        ? pt.lat
        : this.metadata.bounds.maxLat;
    this.metadata.bounds.maxLon =
      pt.lon > this.metadata.bounds.maxLon
        ? pt.lon
        : this.metadata.bounds.maxLon;
  }
}

export class GPXWaypoint {
  public lat = 0;
  public lon = 0;
  public ele: number | null = null;
  public datetime: Date | null = null;
  public magvar: number | null = null;
  public geoidHeight: number | null = null;
  public name: string | null = null;
  public cmt: string | null = null;
  public desc: string | null = null;
  public src: string | null = null;
  public link: GPXLinkType[] = [];
  public sym: string | null = null;
  public type: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public fix: any = null;
  public sat: number | null = null;
  public hdop: number | null = null;
  public vdop: number | null = null;
  public pdop: number | null = null;
  public ageOfGpsData: number | null = null;
  public dgpsid: number | null = null;
  public extensions: Extensions = {};

  constructor(lat?: number, lon?: number) {
    this.lat = lat || 0;
    this.lon = lon || 0;
  }
}

export class GPXRoute {
  public name: string | null = '';
  public cmt: string | null = null;
  public desc: string | null = null;
  public src: string | null = null;
  public link: GPXLinkType[] = [];
  public number: number | null = null;
  public type: string | null = null;
  public extensions: Extensions = {};
  public rtept: GPXWaypoint[] = [];

  constructor(name?: string) {
    this.name = name || '';
  }
}

export class GPXTrack {
  public name: string | null = '';
  public cmt: string | null = null;
  public desc: string | null = null;
  public src: string | null = null;
  public link: GPXLinkType[] = [];
  public number: number | null = null;
  public type: string | null = null;
  public extensions: Extensions = {};
  public trkseg: GPXTrackSegment[] = [];

  constructor(name?: string) {
    this.name = name || '';
  }
}

export class GPXTrackSegment {
  public trkpt: GPXWaypoint[] = [];
  public extensions: Extensions = {};
}

export enum GPXFixType {
  NONE = 'none',
  '2D' = '2d',
  '3D' = '3d',
  DGPS = 'dgps',
  PPS = 'pps'
}

export class GPXMetadataType {
  public name = '';
  public desc = '';
  public author: GPXPersonType | null = null;
  public copyright: GPXCopyrightType | null = null;
  public link: GPXLinkType[] = [];
  public time: string = new Date().toISOString();
  public keywords = '';
  public bounds: GPXBoundsType = new GPXBoundsType();
  public extensions: Extensions = {};
}

export class GPXLinkType {
  public href = '';
  public text = '';
  public type = '';
}

export class GPXPersonType {
  public name = '';
  public email: GPXEmailType = new GPXEmailType();
  public link: GPXLinkType = new GPXLinkType();
}

export class GPXEmailType {
  public id = '';
  public domain = '';
}

export class GPXCopyrightType {
  public author = '';
  public license = '';
  public year = '';
}

export class GPXBoundsType {
  public minLat = 90;
  public minLon = 180;
  public maxLat = -90;
  public maxLon = -180;
}
