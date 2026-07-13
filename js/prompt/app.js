// prompt/app.js — '프롬프트의 비밀' 페이지 시작점.
// 데모 1(같은 질문, 다른 앞글)과 데모 2(숨은 쪽지), 핵심 개념을 연결한다.

import { $ } from '../utils.js';
import { initPromptSim } from './promptSim.js';
import { initHiddenNoteSim } from './hiddenNoteSim.js';
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

initConcepts($('#concept-row'));
