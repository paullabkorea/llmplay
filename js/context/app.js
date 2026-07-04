// context/app.js — '대화의 비밀' 페이지 시작점.
// 채팅 시뮬레이션(묶음 재전송·토큰 게이지)과 핵심 개념 팝오버를 연결한다.

import { $ } from '../utils.js';
import { initChatSim } from './chatSim.js';
import { initConcepts } from '../ui/concepts.js';

initChatSim({
  chatLog: $('#chat-log'),
  bundleStack: $('#bundle-stack'),
  bundleFrame: $('#bundle-frame'),
  reqTokens: $('#req-tokens'),
  sendCaption: $('#send-caption'),
  turnLabel: $('#turn-label'),
  tokenFill: $('#token-fill'),
  tokenLabel: $('#token-label'),
  focusFill: $('#focus-fill'),
  focusLabel: $('#focus-label'),
  statusMsg: $('#status-msg'),
  banner: $('#limit-banner'),
  btnSend: $('#btn-send'),
  btnAuto: $('#btn-auto'),
  btnReset: $('#btn-chat-reset'),
  btnSummary: $('#btn-summary'),
});

initConcepts($('#concept-row'));
