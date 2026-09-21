// multimodal/fx.js — '이미지·음성의 비밀' 페이지 전용 연출.
// 타자 효과와 연출 취소는 여러 페이지가 함께 쓰므로 ui/typeFx.js에 있다.

import { register, unregister } from '../ui/typeFx.js';

export { cancelAll, typeText } from '../ui/typeFx.js';

/**
 * 생성 모델 연출: 큰 블록으로 뭉개진 그림이 점점 또렷해진다.
 * drawFn(ctx, size)는 완성된 그림을 그린다.
 */
export function pixelateReveal(canvas, drawFn, durationMs = 1600) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const source = document.createElement('canvas');
  source.width = size; source.height = size;
  drawFn(source.getContext('2d'), size);

  const tiny = document.createElement('canvas');
  const tinyCtx = tiny.getContext('2d');

  const start = performance.now();
  let frame = 0;
  function tick(now) {
    const t = Math.min(1, (now - start) / durationMs);
    // 블록 크기: 처음 48px → 끝 1px (앞부분에서 빠르게 줄어듦)
    const block = Math.max(1, Math.round(48 * (1 - t) ** 2));
    const small = Math.max(1, Math.round(size / block));
    tiny.width = small; tiny.height = small;
    tinyCtx.imageSmoothingEnabled = true;
    tinyCtx.drawImage(source, 0, 0, size, size, 0, 0, small, small);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(tiny, 0, 0, small, small, 0, 0, size, size);
    if (block > 1) {
      frame = requestAnimationFrame(tick);
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(source, 0, 0);
      finish();
    }
  }
  function finish() {
    cancelAnimationFrame(frame);
    unregister(finish);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(source, 0, 0);
  }
  register(finish);
  frame = requestAnimationFrame(tick);
  return finish;
}
