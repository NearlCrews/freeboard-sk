import { XMLParser } from 'fast-xml-parser';

const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  attributesGroupName: '$',
  textNodeName: '_',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: (
    _name: string,
    jPath: string | { getCurrentTag(): string | undefined },
    _isLeafNode: boolean,
    isAttribute: boolean
  ) => !isAttribute && typeof jPath === 'string' && jPath.includes('.')
};

const parser = new XMLParser(PARSER_OPTIONS);

export function parseXmlString(xml: string): object {
  return parser.parse(xml) as object;
}

export function parseStringPromise(xml: string): Promise<object> {
  return Promise.resolve(parseXmlString(xml));
}
