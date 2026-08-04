import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { signJsapi } from './wechat-jssdk';

describe('wechat jssdk signature', () => {
  it('拼接串遵循官方字段顺序并做 sha1', () => {
    const ticket = 'kgt8ON7yVITDhtdwci0qeZg';
    const nonce = 'Wm3WZYTPz0wzccnW';
    const timestamp = 1414587457;
    const url = 'https://mp.example.com/?params=value';

    const expectedRaw = `jsapi_ticket=${ticket}&noncestr=${nonce}&timestamp=${timestamp}&url=${url}`;
    const expected = createHash('sha1').update(expectedRaw).digest('hex');

    expect(signJsapi(ticket, nonce, timestamp, url)).toBe(expected);
  });

  it('签名前剥离 URL 的 # 片段（官方要求）', () => {
    const withHash = signJsapi('t', 'n', 1, 'https://a.com/p?x=1#section');
    const withoutHash = signJsapi('t', 'n', 1, 'https://a.com/p?x=1');
    expect(withHash).toBe(withoutHash);
  });
});
