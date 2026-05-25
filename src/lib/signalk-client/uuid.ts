// Vendored from signalk-client-angular ^2.1.0 (Apache 2.0, AdrianP).
// Pure ESM, named exports, tree-shakable.
//
// UUID: js library to generate and parse UUIDs, TimeUUIDs, and generate
// TimeUUID based on dates for range selections.
// See http://www.ietf.org/rfc/rfc4122.txt

export class UUID {
  private limitUI04 = this.maxFromBits(4);
  private limitUI06 = this.maxFromBits(6);
  private limitUI08 = this.maxFromBits(8);
  private limitUI12 = this.maxFromBits(12);
  private limitUI14 = this.maxFromBits(14);
  private limitUI16 = this.maxFromBits(16);
  private limitUI32 = this.maxFromBits(32);
  private limitUI40 = this.maxFromBits(40);
  private limitUI48 = this.maxFromBits(48);
  private version = 0;
  private hex = '';

  constructor() {
    this.create();
  }

  toString(): string {
    return this.hex;
  }

  toURN(): string {
    return 'urn:uuid:' + this.hex;
  }

  toSignalK(): string {
    return `urn:mrn:signalk:uuid:${this.hex}`;
  }

  toBytes(): number[] {
    const parts = this.hex.split('-');
    const ints: number[] = [];
    let intPos = 0;
    for (const part of parts) {
      for (let j = 0; j < part.length; j += 2) {
        ints[intPos++] = parseInt(part.substr(j, 2), 16);
      }
    }
    return ints;
  }

  private maxFromBits(bits: number): number {
    return Math.pow(2, bits);
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomUI04(): number {
    return this.getRandomInt(0, this.limitUI04 - 1);
  }

  private randomUI06(): number {
    return this.getRandomInt(0, this.limitUI06 - 1);
  }

  private randomUI08(): number {
    return this.getRandomInt(0, this.limitUI08 - 1);
  }

  private randomUI12(): number {
    return this.getRandomInt(0, this.limitUI12 - 1);
  }

  private randomUI14(): number {
    return this.getRandomInt(0, this.limitUI14 - 1);
  }

  private randomUI16(): number {
    return this.getRandomInt(0, this.limitUI16 - 1);
  }

  private randomUI32(): number {
    return this.getRandomInt(0, this.limitUI32 - 1);
  }

  private randomUI40(): number {
    return (
      (0 | (Math.random() * (1 << 30))) +
      (0 | (Math.random() * (1 << (40 - 30)))) * (1 << 30)
    );
  }

  private randomUI48(): number {
    return (
      (0 | (Math.random() * (1 << 30))) +
      (0 | (Math.random() * (1 << (48 - 30)))) * (1 << 30)
    );
  }

  private create(): void {
    this.fromParts(
      this.randomUI32(),
      this.randomUI16(),
      0x4000 | this.randomUI12(),
      0x80 | this.randomUI06(),
      this.randomUI08(),
      this.randomUI48()
    );
  }

  private paddedString(
    input: string,
    length: number,
    z: string | null = null
  ): string {
    let value = String(input);
    let pad = !z ? '0' : z;
    let i = length - value.length;
    for (; i > 0; i >>>= 1, pad += pad) {
      if (i & 1) {
        value = pad + value;
      }
    }
    return value;
  }

  private fromParts(
    timeLow: number,
    timeMid: number,
    timeHiAndVersion: number,
    clockSeqHiAndReserved: number,
    clockSeqLow: number,
    node: number
  ): this {
    this.version = (timeHiAndVersion >> 12) & 0xf;
    this.hex =
      this.paddedString(timeLow.toString(16), 8) +
      '-' +
      this.paddedString(timeMid.toString(16), 4) +
      '-' +
      this.paddedString(timeHiAndVersion.toString(16), 4) +
      '-' +
      this.paddedString(clockSeqHiAndReserved.toString(16), 2) +
      this.paddedString(clockSeqLow.toString(16), 2) +
      '-' +
      this.paddedString(node.toString(16), 12);
    return this;
  }
}
