// engine.js — 생성 과정을 이끄는 상태 기계(엔진).
//
// 한 라운드(단어 1개 생성)는 이 순서로 진행된다:
//   tokenize → embed → compute → probs → sample → append
//
// 엔진은 화면을 전혀 모른다. 단계가 바뀔 때마다 이벤트만 쏘고,
// UI 모듈들이 각자 구독해서 그림을 그린다. (유지보수 포인트!)
//
// 이벤트 종류:
//  - 'reset'  : 시나리오가 (다시) 시작됨       detail = { scenario, tokens }
//  - 'stage'  : 한 단계가 진행됨              detail = { stage, round, tokens, ... }
//  - 'done'   : 문장 생성 완료                detail = { tokens, reason }

import { STAGES, END_TOKEN } from '../config.js';
import { getDistribution, sampleIndex } from './model.js';

export class GenerationEngine extends EventTarget {
  constructor() {
    super();
    this.scenario = null;
    this.temperature = 1;
    this._clear();
  }

  _clear() {
    this.generated = [];   // 지금까지 생성한 토큰들
    this.round = 0;        // 몇 번째 단어를 만드는 중인지
    this.stageIndex = 0;   // STAGES 배열에서의 현재 위치
    this.dist = null;      // 현재 라운드의 확률 분포
    this.pickedIndex = -1; // 뽑힌 후보 인덱스
    this.done = false;
    this._pendingDone = null; // append 다음 next() 호출 때 'done'을 쏘기 위한 예약
  }

  /** 프롬프트 + 지금까지 생성한 토큰 전체 */
  contextTokens() {
    return [...this.scenario.prompt, ...this.generated];
  }

  /** 확률표를 찾을 때 기준이 되는 '마지막 토큰' */
  lastToken() {
    const tokens = this.contextTokens();
    return tokens[tokens.length - 1];
  }

  /** 시나리오를 새로 시작(또는 처음부터 다시) */
  reset(scenario = this.scenario) {
    this.scenario = scenario;
    this._clear();
    this._emit('reset', { scenario, tokens: this.contextTokens() });
  }

  /** 온도 변경. 확률이 화면에 떠 있는 중이면 막대도 실시간으로 갱신한다. */
  setTemperature(t) {
    this.temperature = t;
    const showingProbs = this.dist && !this.done && STAGES[this.stageIndex] === 'sample';
    if (showingProbs) {
      this.dist = getDistribution(this.scenario, this.lastToken(), t);
      this._emit('stage', {
        stage: 'probs',
        round: this.round,
        tokens: this.contextTokens(),
        dist: this.dist,
        live: true, // 슬라이더 조작에 의한 갱신 — 설명문은 바꾸지 않음
      });
    }
  }

  /** 한 단계 진행. 진행한 단계 이름을 돌려준다(끝났으면 null). */
  next() {
    if (!this.scenario || this.done) return null;

    // 지난 append에서 문장이 끝났다면, 이번 호출에서 'done'을 알린다.
    // (append 연출을 볼 시간을 준 뒤 완료 메시지가 나오도록)
    if (this._pendingDone) {
      this.done = true;
      this._emit('done', { tokens: this.contextTokens(), reason: this._pendingDone });
      this._pendingDone = null;
      return 'done';
    }

    const stage = STAGES[this.stageIndex];
    const detail = { stage, round: this.round, tokens: this.contextTokens() };

    if (stage === 'probs') {
      this.dist = getDistribution(this.scenario, this.lastToken(), this.temperature);
      detail.dist = this.dist;
    } else if (stage === 'sample') {
      this.pickedIndex = sampleIndex(this.dist);
      detail.dist = this.dist;
      detail.pickedIndex = this.pickedIndex;
    } else if (stage === 'append') {
      const token = this.dist[this.pickedIndex].token;
      detail.token = token;
      detail.isEnd = token === END_TOKEN;
      if (!detail.isEnd) this.generated.push(token);
      detail.tokens = this.contextTokens();
    }

    this._emit('stage', detail);

    // 다음 위치로 이동
    if (stage === 'append') {
      this.round += 1;
      this.stageIndex = 0;
      if (detail.isEnd || this.round >= this.scenario.maxRounds) {
        this._pendingDone = detail.isEnd ? 'end-token' : 'max-rounds';
      }
    } else {
      this.stageIndex += 1;
    }

    return stage;
  }

  _emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
