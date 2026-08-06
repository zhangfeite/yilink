import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { describe, expect, it } from 'vitest';

interface SharePanelOpenState {
  handledPublishSuccessSignal: number;
  isOpen: boolean;
  openedAfterPublish: boolean;
}

interface SharePanelHelpers {
  applyPublishSuccessSignal: (
    state: SharePanelOpenState,
    publishSuccessSignal: number,
  ) => SharePanelOpenState;
  distributionCopy: (
    kind: 'moments' | 'xiaohongshu',
    locale: string,
    title: string,
    publicUrl: string,
  ) => string;
  initialSharePanelOpenState: (publishSuccessSignal?: number) => SharePanelOpenState;
  nextPublishSuccessSignal: (current: number) => number;
  sharePanelCopy: {
    'zh-CN': {
      copyMoments: string;
      copyXiaohongshu: string;
    };
  };
}

function loadSharePanelHelpers(): SharePanelHelpers {
  // The app's Vitest config intentionally preserves JSX for Next.js. Compile only the exported,
  // JSX-free state/copy block so these unit tests exercise the real implementation.
  const source = readFileSync(new URL('./share-panel.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('export interface SharePanelOpenState');
  const end = source.indexOf('function CloseIcon');
  if (start < 0 || end <= start) throw new Error('Share panel helper block could not be found');

  const output = transpileModule(source.slice(start, end), {
    compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
  }).outputText;
  const helperExports: Partial<SharePanelHelpers> = {};
  runInNewContext(output, { exports: helperExports });
  return helperExports as SharePanelHelpers;
}

const {
  applyPublishSuccessSignal,
  distributionCopy,
  initialSharePanelOpenState,
  nextPublishSuccessSignal,
  sharePanelCopy,
} = loadSharePanelHelpers();

describe('share panel publish linkage', () => {
  it('starts closed without a publish celebration', () => {
    expect(initialSharePanelOpenState()).toEqual({
      handledPublishSuccessSignal: 0,
      isOpen: false,
      openedAfterPublish: false,
    });
  });

  it('advances the signal only after a successful publish', () => {
    expect(nextPublishSuccessSignal(0)).toBe(1);
    expect(nextPublishSuccessSignal(4)).toBe(5);
  });

  it('opens in the published state when a new success signal arrives', () => {
    const state = applyPublishSuccessSignal(initialSharePanelOpenState(), 1);

    expect(state).toEqual({
      handledPublishSuccessSignal: 1,
      isOpen: true,
      openedAfterPublish: true,
    });
  });

  it('does not reopen for an already handled publish signal', () => {
    const closedAfterFirstPublish = {
      handledPublishSuccessSignal: 1,
      isOpen: false,
      openedAfterPublish: false,
    };

    expect(applyPublishSuccessSignal(closedAfterFirstPublish, 1)).toBe(closedAfterFirstPublish);
  });
});

describe('distribution copy templates', () => {
  const publicUrl = 'https://yilink.app/p/lin-xiaoman';

  it('keeps both one-click distribution button labels explicit', () => {
    expect(sharePanelCopy['zh-CN'].copyXiaohongshu).toBe('复制小红书简介文案');
    expect(sharePanelCopy['zh-CN'].copyMoments).toBe('复制朋友圈文案');
  });

  it('builds Xiaohongshu bio copy with the page title and short public URL', () => {
    expect(distributionCopy('xiaohongshu', 'zh-CN', '林小满插画', publicUrl)).toBe(
      `我的作品和联系方式都整理在这里：林小满插画\n${publicUrl}`,
    );
  });

  it('builds Moments copy with the page title and short public URL', () => {
    expect(distributionCopy('moments', 'zh-CN', '林小满插画', publicUrl)).toBe(
      `我的新主页上线了：林小满插画\n作品、链接和联系方式都在这里 → ${publicUrl}`,
    );
  });

  it('provides localized English distribution copy', () => {
    expect(distributionCopy('xiaohongshu', 'en', 'Lin Xiaoman', publicUrl)).toContain(
      'My work and contact details are all here: Lin Xiaoman',
    );
    expect(distributionCopy('moments', 'en', 'Lin Xiaoman', publicUrl)).toContain(publicUrl);
  });
});
