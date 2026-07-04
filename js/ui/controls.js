// controls.js — 아래쪽 조작부(문장 선택, 재생 버튼, 속도, 온도 슬라이더) 담당.
// 실제 동작은 콜백으로 app.js에 맡기고, 여기서는 DOM 연결만 한다.

export function initControls(elements, callbacks) {
  const { scenarioSelect, btnPlay, btnStep, btnReset, speedSelect, tempSlider, tempValue } = elements;
  const { scenarios, onScenarioChange, onPlayToggle, onStep, onReset, onTempChange } = callbacks;

  // 시나리오 목록 채우기
  scenarios.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = s.title;
    scenarioSelect.appendChild(opt);
  });

  scenarioSelect.addEventListener('change', () => {
    onScenarioChange(scenarios[Number(scenarioSelect.value)]);
  });

  btnPlay.addEventListener('click', onPlayToggle);
  btnStep.addEventListener('click', onStep);
  btnReset.addEventListener('click', onReset);

  tempSlider.addEventListener('input', () => {
    const t = parseFloat(tempSlider.value);
    tempValue.textContent = t.toFixed(1);
    onTempChange(t);
  });

  return {
    /** 현재 속도 배율 */
    getSpeed: () => parseFloat(speedSelect.value),

    /** 현재 온도 */
    getTemperature: () => parseFloat(tempSlider.value),

    /** 재생 버튼 표시 갱신 */
    setPlaying(playing) {
      btnPlay.textContent = playing ? '일시정지' : '자동 재생';
      btnPlay.classList.toggle('btn-primary', !playing);
    },
  };
}
