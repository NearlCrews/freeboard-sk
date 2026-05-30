import { parseStringPromise } from 'xml2js';

interface WorkerMessage {
  sourceType: 'xml';
  value: string;
}

type WorkerResult = object | null;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { sourceType, value } = event.data;
  let result: WorkerResult = null;
  try {
    if (sourceType === 'xml') {
      result = await parseStringPromise(value);
    }
    self.postMessage(result);
  } catch {
    self.postMessage(null);
  }
};
