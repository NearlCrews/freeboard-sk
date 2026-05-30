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

export function parseXmlString(xml: string): object {
  return parser.parse(xml) as object;
}
