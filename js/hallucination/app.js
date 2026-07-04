// hallucination/app.js — '환각의 비밀' 페이지 시작점.
// 트윈 시뮬레이션(진짜 질문 vs 지어낼 수밖에 없는 질문)과 핵심 개념을 연결한다.

import { $ } from '../utils.js';
import { initTwinSim } from './twinSim.js';
import { initConcepts } from '../ui/concepts.js';
import { TWIN } from './data.js';

// 질문 문구는 데이터에서 가져와 화면에 채운다 (데이터만 고치면 화면도 바뀜)
$('#q-real').textContent = TWIN.real.question;
$('#q-fake').textContent = TWIN.fake.question;

initTwinSim({
  panels: {
    real: {
      answer: $('#answer-real'),
      probList: $('#probs-real'),
      conf: $('#conf-real'),
    },
    fake: {
      answer: $('#answer-fake'),
      probList: $('#probs-fake'),
      conf: $('#conf-fake'),
    },
  },
  btnPlay: $('#btn-play'),
  btnStep: $('#btn-step'),
  btnReset: $('#btn-reset'),
  speedSelect: $('#speed-select'),
  stageLabel: $('#stage-label'),
  verdict: $('#twin-verdict'),
  verdictText: $('#twin-verdict-text'),
});

initConcepts($('#concept-row'));
