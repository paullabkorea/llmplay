// hiddenNoteSim.js — '프롬프트의 비밀' 데모 2 (숨은 쪽지 = 시스템 프롬프트).
// 숨은 쪽지 버튼을 바꾸면, 같은 질문("안녕! 넌 누구야?")에도
// 전혀 다른 답이 나오는 것을 채팅 화면으로 보여 준다.

import { el } from '../utils.js';
import { HIDDEN_QUESTION, HIDDEN_NOTES } from './data.js';

export function initHiddenNoteSim(refs) {
  // refs: noteBtnRow, noteText, chatQuestion, bundleQuestion, chatAnswerSlot

  // 같은 질문을 채팅 화면과 전송 묶음 양쪽에 채운다 (데이터만 고치면 둘 다 바뀜)
  refs.chatQuestion.textContent = HIDDEN_QUESTION;
  refs.bundleQuestion.textContent = HIDDEN_QUESTION;

  const buttons = HIDDEN_NOTES.map((n) => {
    const btn = el('button', 'variant-btn', n.btn);
    btn.type = 'button';
    btn.addEventListener('click', () => select(n));
    refs.noteBtnRow.appendChild(btn);
    return { n, btn };
  });

  function select(note) {
    buttons.forEach(({ n, btn }) => btn.classList.toggle('active', n.id === note.id));
    refs.noteText.textContent = note.note;

    // 답 말풍선은 매번 새로 만들어 등장 애니메이션이 다시 걸리게 한다
    refs.chatAnswerSlot.replaceChildren(
      el('div', 'chat-bubble chat-ai', note.answer),
    );
  }

  select(HIDDEN_NOTES[0]);
}
