// training/app.js — '학습의 비밀' 페이지 시작점.
// 다이얼 시뮬레이션(학습 vs 추론)과 핵심 개념 팝오버를 연결한다.

import { $ } from '../utils.js';
import { initDialSim } from './dialSim.js';
import { initConcepts } from '../ui/concepts.js';

initDialSim({
  board: $('#dial-board'),
  grid: $('#dial-grid'),
  flowLane: $('#flow-lane'),
  badge: $('#mode-badge'),
  caption: $('#mode-caption'),
  btnInfer: $('#mode-infer'),
  btnTrain: $('#mode-train'),
  zoomIndex: $('#zoom-index'),
  zoomWeight: $('#zoom-weight'),
  zoomCaption: $('#zoom-caption'),
});

initConcepts($('#concept-row'));
