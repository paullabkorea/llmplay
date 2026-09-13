// multimodal/fx.js — 화면 연출 (타자 효과, 흐린 그림이 또렷해지는 생성 연출).
// 시작한 연출은 모두 등록해 두고, 다음 단계로 넘어가거나 처음부터 다시 할 때 한꺼번에 멈춘다.

const active = new Set();

export function cancelAll() {
  active.forEach((cancel) => cancel());
  active.clear();
}

/** 글자를 한 자씩 찍는다. speed는 배속(1이 보통). */
export function typeText(el, text, speed = 1) {
  el.textContent = '';
  let i = 0;
  const step = 34 / speed;
  const timer = setInterval(() => {
    i++;
    el.textContent = text.slice(0, i);
    if (i >= text.length) finish();
  }, step);
  function finish() { clearInterval(timer); active.delete(finish); el.textContent = text; }
  active.add(finish);
  return finish;
}

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
    active.delete(finish);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(source, 0, 0);
  }
  active.add(finish);
  frame = requestAnimationFrame(tick);
  return finish;
}
