// multimodal/player.js — 단계 재생 상태 기계. 화면을 모르고 이벤트만 낸다.
//   'reset' : 시나리오를 새로 골랐거나 처음부터 (index 0)
//   'step'  : 다음 단계로 넘어감 ({ index, step })
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
}
