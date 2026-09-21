// core/stepPlayer.js — 단계 재생 상태 기계. 화면을 모르고 이벤트만 낸다.
// '이미지·음성의 비밀', '에이전트의 비밀'처럼 단계별로 넘기는 페이지들이 함께 쓴다.
//   'reset' : 시나리오를 새로 골랐거나 처음부터 (index 0)
//   'step'  : 다음 또는 이전 단계로 옮겨감 ({ index, step })
//   'done'  : 마지막 단계에 도착

export class StepPlayer extends EventTarget {
  constructor() {
    super();
    this.scenario = null;
    this.index = 0;
  }

  get done() {
    return !!this.scenario && this.index >= this.scenario.steps.length;
  }

  /** 현재 단계 정보 (index 0이면 null: 아직 시작 전) */
  get current() {
    return this.index === 0 ? null : this.scenario.steps[this.index - 1];
  }

  reset(scenario = this.scenario) {
    this.scenario = scenario;
    this.index = 0;
    this.dispatchEvent(new CustomEvent('reset', { detail: { scenario } }));
  }

  next() {
    if (!this.scenario || this.done) return;
    this.index++;
    this.dispatchEvent(new CustomEvent('step', { detail: { index: this.index, step: this.current } }));
    if (this.done) this.dispatchEvent(new CustomEvent('done'));
  }

  /** 한 단계 뒤로. 처음까지 돌아가면 reset과 같다. */
  prev() {
    if (!this.scenario || this.index === 0) return;
    this.index--;
    if (this.index === 0) { this.reset(); return; }
    this.dispatchEvent(new CustomEvent('step', { detail: { index: this.index, step: this.current } }));
  }
}
