import { parseXmlString } from './xml-parser';

interface WorkerMessage {
  sourceType: 'xml';
  value: string;
}

type WorkerResult = object | null;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { sourceType, value } = event.data;
  let result: WorkerResult = null;
  try {
    if (sourceType === 'xml') {
      result = parseXmlString(value);
    }
    self.postMessage(result);
  } catch {
    self.postMessage(null);
  }
};
