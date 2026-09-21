// typeFx.js — 단계 재생 페이지들이 함께 쓰는 화면 연출.
// 시작한 연출은 모두 등록해 두고, 다음 단계로 넘어가거나 처음부터 다시 할 때 한꺼번에 멈춘다.

const active = new Set();

/** 연출 하나를 등록한다. cancel()은 "지금 즉시 끝난 상태로 만들기"여야 한다. */
export function register(cancel) {
  active.add(cancel);
}

export function unregister(cancel) {
  active.delete(cancel);
}

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
  function finish() { clearInterval(timer); unregister(finish); el.textContent = text; }
  register(finish);
  return finish;
}
