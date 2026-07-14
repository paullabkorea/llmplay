// prompt/app.js — '프롬프트의 비밀' 페이지 시작점.
// 데모 1(같은 질문, 다른 앞글), 데모 2(숨은 쪽지), 데모 3(프롬프트 조립하기),
// 핵심 개념을 연결한다.

import { $ } from '../utils.js';
import { initPromptSim } from './promptSim.js';
import { initHiddenNoteSim } from './hiddenNoteSim.js';
import { initBuildSim } from './buildSim.js';
import { initConcepts } from '../ui/concepts.js';

initPromptSim({
  variantRow: $('#variant-row'),
  sendPrefix: $('#send-prefix'),
  sendQuestion: $('#send-question'),
  probList: $('#direction-probs'),
  variantNote: $('#variant-note'),
  btnSample: $('#btn-sample'),
  sampledAnswer: $('#sampled-answer'),
});

initHiddenNoteSim({
  noteBtnRow: $('#note-btn-row'),
  noteText: $('#note-text'),
  chatQuestion: $('#chat-question'),
  bundleQuestion: $('#bundle-question'),
  chatAnswerSlot: $('#chat-answer-slot'),
});

initBuildSim({
  ingredientRow: $('#ingredient-row'),
  sendBox: $('#build-send-box'),
  gaugeBar: $('#build-gauge-bar'),
  gaugePct: $('#build-gauge-pct'),
  missing: $('#build-missing'),
  answerText: $('#build-answer-text'),
});

initConcepts($('#concept-row'));
