import { XMLParser, type X2jOptions } from 'fast-xml-parser';

const PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  attributesGroupName: '$',
  textNodeName: '_',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: (_name, jPath, _isLeafNode, isAttribute) =>
    !isAttribute && (jPath as string).includes('.')
} satisfies X2jOptions;

const parser = new XMLParser(PARSER_OPTIONS);

// XML is inherently dynamic; consumers access nested keys defensively. Return
// `any` here mirrors what xml2js exposed implicitly via its d.ts and keeps the
// per-file explicit-any count outside callers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseXmlString(xml: string): any {
  return parser.parse(xml);
}
