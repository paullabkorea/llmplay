// chatSim.js — '대화의 비밀' 핵심 화면.
// 왼쪽: 사용자가 보는 채팅 화면 / 오른쪽: 매 턴 실제로 전송되는 '대화 전체 묶음'.
// 각본(CONVERSATION)을 한 턴씩 재생하면서 토큰 게이지와 집중력 게이지를 갱신한다.

import { el, formatNumber } from '../utils.js';
import {
  CONVERSATION,
  SUMMARY_HANDOFF,
  TOKEN_LIMIT_HINT,
  GAUGE_MAX,
  focusFor,
  statusFor,
} from './data.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 메시지 블록의 가로폭(%) — 토큰이 많을수록 길게, 제곱근 눈금으로 완만하게 */
function blockWidth(tokens) {
  return Math.min(100, 10 + Math.sqrt(tokens) * 2.1);
}

/** 숫자를 드르륵 올라가는 연출로 표시 */
function countUp(node, from, to, ms = 500) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / ms);
    node.textContent = formatNumber(Math.round(from + (to - from) * t));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function initChatSim(refs) {
  // refs: chatLog, bundleStack, bundleFrame, reqTokens, sendCaption, turnLabel,
  //       tokenFill, tokenLabel, focusFill, focusLabel, focusFace, statusMsg,
  //       banner, btnSend, btnAuto, btnReset, btnSummary

  let turnIndex = 0;   // 다음에 재생할 각본 턴
  let ctxTokens = 0;   // 대화에 쌓인 전체 토큰(= 다음 요청 때 다시 보내야 하는 양)
  let msgCount = 0;    // 묶음 속 메시지 개수
  let busy = false;    // 턴 재생 중 중복 클릭 방지
  let playing = false; // 자동 재생 중

  // ── 왼쪽: 채팅 말풍선 ──────────────────────────────
  function addBubble(role, text, tokens, paste) {
    refs.chatLog.querySelector('.chat-placeholder')?.remove();
    const bubble = el('div', `bubble bubble-${role}`);
    if (paste) {
      bubble.appendChild(el('span', 'paste-chip', paste));
    }
    bubble.appendChild(el('p', 'bubble-text', text));
    bubble.appendChild(el('span', 'bubble-tokens', `${formatNumber(tokens)}토큰`));
    refs.chatLog.appendChild(bubble);
    refs.chatLog.scrollTop = refs.chatLog.scrollHeight;
    return bubble;
  }

  /** AI가 생각하는 중… 말풍선 (잠시 뒤 진짜 답으로 교체) */
  function addTyping() {
    const bubble = el('div', 'bubble bubble-ai bubble-typing');
    bubble.appendChild(el('span', 'typing-dots', '● ● ●'));
    refs.chatLog.appendChild(bubble);
    refs.chatLog.scrollTop = refs.chatLog.scrollHeight;
    return bubble;
  }

  // ── 오른쪽: 전송 묶음 블록 ─────────────────────────
  function addBlock(role, tokens, paste) {
    refs.bundleStack.querySelector('.bundle-placeholder')?.remove();
    const block = el('div', `msg-block block-${role}`);
    block.style.width = `${blockWidth(tokens)}%`;
    const who = role === 'user' ? '나' : role === 'ai' ? 'AI' : '요약';
    block.appendChild(el('span', 'block-label', `${who} · ${formatNumber(tokens)}`));
    refs.bundleStack.appendChild(block);
    msgCount++;
    refs.bundleStack.scrollTop = refs.bundleStack.scrollHeight;
    return block;
  }

  /** 묶음 전체가 통째로 전송되는 연출 */
  async function playSend(requestTokens) {
    refs.bundleFrame.classList.add('sending');
    refs.sendCaption.textContent =
      `메시지 ${msgCount}개를 통째로 전송 중 — 지금까지의 대화 전체를 다시 보내요!`;
    countUp(refs.reqTokens, Math.max(0, requestTokens - 400), requestTokens, 600);
    await wait(1100);
    refs.bundleFrame.classList.remove('sending');
  }

  // ── 아래: 게이지·상태 메시지 ───────────────────────
  function updateGauges() {
    const focus = focusFor(ctxTokens);
    const { level, msg } = statusFor(ctxTokens);

    refs.tokenFill.style.width = `${Math.min(100, (ctxTokens / GAUGE_MAX) * 100)}%`;
    refs.tokenFill.className = `gauge-fill g-${level}`;
    refs.tokenLabel.textContent = `${formatNumber(ctxTokens)}토큰`;

    refs.focusFill.style.width = `${focus}%`;
    refs.focusFill.className = `gauge-fill ${focus >= 70 ? 'g-ok' : focus >= 50 ? 'g-warn' : 'g-bad'}`;
    refs.focusLabel.textContent = `${focus}%`;

    refs.statusMsg.textContent = msg;
    refs.statusMsg.className = `status-msg s-${level}`;
    refs.turnLabel.textContent =
      turnIndex === 0 ? '' : `주고받은 대화 ${turnIndex}번 · 묶음 속 메시지 ${msgCount}개`;

    refs.banner.hidden = ctxTokens < TOKEN_LIMIT_HINT;
  }

  function setButtons() {
    const finished = turnIndex >= CONVERSATION.length;
    refs.btnSend.disabled = busy || playing || finished;
    refs.btnAuto.disabled = (busy && !playing) || finished;
    refs.btnAuto.textContent = playing ? '멈추기' : '자동 재생';
    refs.btnSend.textContent = finished ? '대화 끝! (처음부터를 눌러 보세요)' : '다음 메시지 보내기';
  }

  // ── 한 턴 재생 ─────────────────────────────────────
  async function sendNext() {
    if (busy || turnIndex >= CONVERSATION.length) return;
    busy = true;
    setButtons();

    const turn = CONVERSATION[turnIndex];
    const requestTokens = ctxTokens + turn.user.tokens; // 이전 대화 전체 + 새 질문

    addBubble('user', turn.user.text, turn.user.tokens, turn.user.paste);
    await wait(300);
    addBlock('user', turn.user.tokens, turn.user.paste);
    ctxTokens += turn.user.tokens;

    await wait(250);
    const typing = addTyping();
    await playSend(requestTokens);

    typing.remove();
    addBubble('ai', turn.ai.text, turn.ai.tokens);
    addBlock('ai', turn.ai.tokens);
    ctxTokens += turn.ai.tokens;
    turnIndex++;

    refs.sendCaption.textContent =
      'AI의 답도 묶음에 쌓여요. 다음 질문 때 이 전체를 또 다시 보내야 해요.';
    updateGauges();

    busy = false;
    setButtons();
  }

  // ── 자동 재생 ──────────────────────────────────────
  async function autoPlay() {
    if (playing) {
      playing = false;
      setButtons();
      return;
    }
    playing = true;
    setButtons();
    while (playing && turnIndex < CONVERSATION.length) {
      await sendNext();
      await wait(700);
    }
    playing = false;
    setButtons();
  }

  // ── 초기화 ─────────────────────────────────────────
  function clearAll() {
    playing = false;
    busy = false;
    turnIndex = 0;
    ctxTokens = 0;
    msgCount = 0;
    refs.chatLog.replaceChildren(
      el('p', 'chat-placeholder', '아직 대화가 없어요.\n"다음 메시지 보내기"를 눌러 보세요!'),
    );
    refs.bundleStack.replaceChildren(
      el('p', 'bundle-placeholder', '전송된 것이 없어요.\n메시지를 보내면 여기에 묶음이 쌓여요.'),
    );
    refs.reqTokens.textContent = '0';
    refs.sendCaption.textContent = '메시지를 보낼 때마다 이 묶음 전체가 통째로 전송돼요.';
  }

  function reset() {
    clearAll();
    updateGauges();
    setButtons();
  }

  /** 1만 토큰 경고 배너의 "요약만 들고 새 대화" 버튼 */
  function resetWithSummary() {
    const before = ctxTokens;
    clearAll();
    addBubble('system', SUMMARY_HANDOFF.text, SUMMARY_HANDOFF.tokens);
    addBlock('system', SUMMARY_HANDOFF.tokens);
    ctxTokens = SUMMARY_HANDOFF.tokens;
    updateGauges();
    refs.statusMsg.textContent =
      `새 대화로 이사 완료! ${formatNumber(before)}토큰이 요약 ${formatNumber(SUMMARY_HANDOFF.tokens)}토큰이 됐어요. AI도 다시 쌩쌩해요.`;
    refs.statusMsg.className = 'status-msg s-ok';
    refs.sendCaption.textContent = '요약 한 장만 들고 새 묶음을 시작했어요. 가볍죠?';
    setButtons();
  }

  refs.btnSend.addEventListener('click', sendNext);
  refs.btnAuto.addEventListener('click', autoPlay);
  refs.btnReset.addEventListener('click', reset);
  refs.btnSummary.addEventListener('click', resetWithSummary);

  reset();
}
