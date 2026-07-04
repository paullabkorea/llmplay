// concepts.js — '핵심 개념' 버튼들. 누르면 버튼 바로 위에 팝오버가 열린다.
// 내용은 index.html의 .concept-pop 안에 있으므로 글 수정은 HTML에서 하면 된다.

export function initConcepts(root) {
  const items = [...root.querySelectorAll('.concept')];

  function closeAll() {
    items.forEach((item) => {
      item.querySelector('.concept-pop').hidden = true;
      const btn = item.querySelector('.concept-btn');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  items.forEach((item) => {
    const btn = item.querySelector('.concept-btn');
    const pop = item.querySelector('.concept-pop');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = pop.hidden;
      closeAll();
      if (opening) {
        pop.hidden = false;
        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    // 팝오버 내부 클릭으로는 닫히지 않게
    pop.addEventListener('click', (e) => e.stopPropagation());
  });

  // 바깥을 클릭하면 닫힘
  document.addEventListener('click', closeAll);
}
