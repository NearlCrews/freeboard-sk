import * as https from 'https';
import * as url from 'url';
import * as http from 'http';
import type { IncomingMessage, RequestOptions } from 'http';

type FetchOpts = RequestOptions & { headers: Record<string, string> };

// HTTP GET
export const fetch = (href: string): Promise<unknown> => {
  const parsed = url.parse(href);
  const opt: FetchOpts = {
    ...parsed,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  };

  const req = href.includes('https') ? https : http;

  return new Promise((resolve, reject) => {
    req
      .get(opt, (res: IncomingMessage) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json: unknown = JSON.parse(data.toString());
            resolve(json);
          } catch {
            reject(new Error(data));
          }
        });
      })
      .on('error', (error: Error) => {
        reject(error);
      });
  });
};

interface PostResult {
  statusCode: number | undefined;
  state: 'COMPLETED' | 'FAILED';
  message?: string;
}

// HTTP POST
export const post = (href: string, data: string): Promise<PostResult> => {
  const parsed = url.parse(href);
  const opt: FetchOpts = {
    ...parsed,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = href.includes('https') ? https : http;

  return new Promise((resolve, reject) => {
    const postReq = req
      .request(opt, (res: IncomingMessage) => {
        let resText = '';
        res.on('data', (chunk: string) => {
          resText += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          if (Math.floor(status / 100) === 2) {
            resolve({
              statusCode: res.statusCode,
              state: 'COMPLETED'
            });
          } else {
            reject({
              statusCode: res.statusCode,
              state: 'FAILED',
              message: resText
            });
          }
        });
      })
      .on('error', (error: Error) => {
        reject({
          statusCode: 400,
          state: 'FAILED',
          message: error.message
        });
      });

    postReq.write(data);
    postReq.end();
  });
};
