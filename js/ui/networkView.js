// networkView.js — 가운데 패널: 신경망(다이얼이 가득한 판들)을 캔버스에 그린다.
// compute 단계 동안 신호 파도가 판(레이어)들을 차례로 지나가며 다이얼이 돌아간다.

import { NETWORK, TOTAL_DIALS, STAGE_DURATIONS } from '../config.js';
import { formatNumber } from '../utils.js';

const SHEET = { x: 44, y: 118, w: 310, h: 214 };  // 맨 앞 판의 위치와 크기
const LAYER_OFFSET = { x: 21, y: -15 };            // 뒤 판일수록 이만큼씩 밀려남

export function initNetworkView(engine, { canvas, calcCounter, paramLabel }, getSpeed) {
  const ctx = canvas.getContext('2d');
  const { layers, rows, cols } = NETWORK;

  // 다이얼 바늘 각도 (layers × rows × cols)
  let angles = [];
  let spinSpeeds = [];

  let animating = false;
  let animStart = 0;
  let animDuration = 0;
  let calcCount = 0;

  paramLabel.textContent =
    `다이얼(파라미터) ${TOTAL_DIALS}개짜리 모형 — 진짜 GPT는 수천억~1조 개!`;

  function resetAngles() {
    angles = [];
    spinSpeeds = [];
    for (let l = 0; l < layers; l++) {
      const layerAngles = [];
      const layerSpeeds = [];
      for (let d = 0; d < rows * cols; d++) {
        layerAngles.push(Math.random() * Math.PI * 2);
        layerSpeeds.push(0.15 + Math.random() * 0.35);
      }
      angles.push(layerAngles);
      spinSpeeds.push(layerSpeeds);
    }
  }

  /** 판 하나를 그린다. depth: 0(맨 앞) ~ layers-1(맨 뒤), glow: 0~1 활성 정도 */
  function drawSheet(depth, glow) {
    const x = SHEET.x + LAYER_OFFSET.x * depth;
    const y = SHEET.y + LAYER_OFFSET.y * depth;
    const shade = 97 - depth * 3; // 뒤로 갈수록 살짝 어둡게 (라이트 테마)

    // 판 몸체
    ctx.fillStyle = `hsl(215 25% ${shade}%)`;
    ctx.strokeStyle = glow > 0.05 ? `rgba(79, 70, 229, ${0.3 + glow * 0.7})` : 'rgba(15, 23, 42, 0.16)';
    ctx.lineWidth = glow > 0.05 ? 2.5 : 1;
    roundRect(ctx, x, y, SHEET.w, SHEET.h, 8);
    ctx.fill();
    ctx.stroke();

    // 다이얼들
    const cellW = SHEET.w / cols;
    const cellH = SHEET.h / rows;
    const r = Math.min(cellW, cellH) * 0.32;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = x + cellW * (col + 0.5);
        const cy = y + cellH * (row + 0.5);
        const angle = angles[depth][row * cols + col];

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(215 20% ${shade - 8}%)`;
        ctx.fill();
        ctx.strokeStyle = glow > 0.05
          ? `rgba(79, 70, 229, ${0.35 + glow * 0.65})`
          : 'rgba(15, 23, 42, 0.14)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 바늘
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r * 0.85, cy + Math.sin(angle) * r * 0.85);
        ctx.strokeStyle = glow > 0.05 ? '#4f46e5' : 'rgba(71, 85, 105, 0.7)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
  }

  /** 현재 활성 레이어(신호 파도 위치). 뒤(입력) → 앞(출력)으로 흐른다. */
  function activeLayerAt(progress) {
    const wavePos = (progress * NETWORK.waveCount * layers) % layers;
    return layers - 1 - wavePos; // depth 기준
  }

  function draw(progress = -1) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const active = progress >= 0 ? activeLayerAt(progress) : -99;

    for (let depth = layers - 1; depth >= 0; depth--) {
      const dist = Math.abs(depth - active);
      const glow = progress >= 0 ? Math.max(0, 1 - dist) : 0;
      drawSheet(depth, glow);
    }
  }

  function frame(now) {
    if (!animating) return;
    const elapsed = now - animStart;
    const progress = Math.min(1, elapsed / animDuration);

    // 활성 레이어 근처의 다이얼을 돌린다
    const active = activeLayerAt(progress);
    for (let l = 0; l < layers; l++) {
      const intensity = Math.max(0, 1.5 - Math.abs(l - active));
      if (intensity <= 0) continue;
      for (let d = 0; d < rows * cols; d++) {
        angles[l][d] += spinSpeeds[l][d] * intensity;
      }
    }

    // 계산 횟수 카운터 (연출용 숫자)
    calcCount += Math.floor(2_000_000 + Math.random() * 9_000_000);
    calcCounter.textContent = `곱하기·더하기 ${formatNumber(calcCount)}번째…`;

    draw(progress);

    if (progress >= 1) {
      animating = false;
      calcCounter.textContent = `약 ${formatNumber(calcCount)}번 계산 완료`;
      draw();
      return;
    }
    requestAnimationFrame(frame);
  }

  function startCompute() {
    animating = true;
    animStart = performance.now();
    animDuration = STAGE_DURATIONS.compute / getSpeed();
    calcCount = 0;
    requestAnimationFrame(frame);
  }

  engine.addEventListener('reset', () => {
    animating = false;
    calcCounter.innerHTML = '&nbsp;';
    resetAngles();
    draw();
  });

  engine.addEventListener('stage', (e) => {
    if (e.detail.stage === 'compute') startCompute();
  });

  resetAngles();
  draw();
}

/** 둥근 사각형 경로 (구형 브라우저 호환용 직접 구현) */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
