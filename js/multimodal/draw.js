// multimodal/draw.js — 캔버스 그림 도우미 (집 그림, 격자, 모자이크, 파형, 표 캡처).
// 모두 넘겨받은 ctx 위에만 그리므로 화면 상태를 갖지 않는다.

import { patchFeatures } from './model.js';

/** 원본 집 그림. 초록 지붕, 파란 문, 창문 2개, OPEN 표지판, 오른쪽 위 해. */
export const HOUSE_ORIGINAL = {
  sky: '#e0f2fe', ground: '#bbf7d0', wall: '#fff7ed',
  roof: '#15803d', door: '#2563eb', window: '#bae6fd',
  windows: 2, sign: 'OPEN', sunX: 315, sunY: 65,
};

/** 이미지 생성 모델이 '지붕만 보라색' 주문서를 읽고 처음부터 새로 그린 결과. 지붕 말고도 이것저것 달라진다. */
export const HOUSE_REGENERATED = {
  sky: '#dbeafe', ground: '#d9f99d', wall: '#fefce8',
  roof: '#7c3aed', door: '#0f766e', window: '#e0f2fe',
  windows: 3, sign: 'OPFN', sunX: 70, sunY: 70,
};

export function drawHouse(ctx, size, variant = HOUSE_ORIGINAL) {
  const v = { ...HOUSE_ORIGINAL, ...variant };
  const s = size / 384; // 원래 384 기준 좌표를 비율로 축소
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = v.sky; ctx.fillRect(0, 0, 384, 384);
  ctx.fillStyle = v.ground; ctx.fillRect(0, 300, 384, 84);
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(v.sunX, v.sunY, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = v.wall; ctx.fillRect(88, 175, 208, 145);
  ctx.fillStyle = v.roof; ctx.beginPath(); ctx.moveTo(60, 180); ctx.lineTo(192, 65); ctx.lineTo(324, 180); ctx.closePath(); ctx.fill();
  ctx.fillStyle = v.door; ctx.fillRect(161, 227, 62, 93);
  ctx.fillStyle = v.window;
  if (v.windows >= 2) { ctx.fillRect(108, 203, 35, 40); ctx.fillRect(242, 203, 35, 40); }
  if (v.windows >= 3) { ctx.fillRect(108, 262, 35, 40); }
  ctx.fillStyle = '#ffffff'; ctx.fillRect(152, 190, 80, 25);
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(v.sign, 192, 209);
  ctx.restore();
}

/** 격자 선을 덧그린다 (조각내기 연출). */
export function drawGrid(ctx, size, columns, color = 'rgba(15, 23, 42, 0.55)') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (let i = 1; i < columns; i++) {
    const p = Math.round(i * size / columns) + 0.5;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
  }
  ctx.restore();
}

/** 조각별 평균 색으로 채운 모자이크 (조각 하나 = 숫자 묶음 하나). */
export function drawMosaic(ctx, size, patches, columns) {
  const cell = size / columns;
  patches.forEach((p) => {
    ctx.fillStyle = `rgb(${p.rgb.map((n) => Math.round(n * 255)).join(',')})`;
    ctx.fillRect(Math.floor(p.col * cell), Math.floor(p.row * cell), Math.ceil(cell), Math.ceil(cell));
  });
}

/** 그림 함수를 보이지 않는 캔버스에 그린 뒤 조각별 평균 색을 계산한다. */
export function computePatches(drawFn, size, columns) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  drawFn(ctx, size);
  return patchFeatures(ctx.getImageData(0, 0, size, size).data, size, size, columns);
}

/**
 * 파형 그리기. chunks가 있으면 시간 조각 경계를, labels가 있으면 음절 글자를 함께 그린다.
 * samples: Float32Array(-1~1), duration: 전체 길이(초)
 */
export function drawWave(ctx, width, height, samples, { chunks = [], labels = [], accent = '#4f46e5' } = {}) {
  ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, width, height);
  const top = labels.length ? 26 : 0;          // 음절 글자가 들어갈 윗줄
  const mid = top + (height - top) / 2;
  const scale = (height - top) / 2 * 0.85;     // 파형 최대 높이
  const duration = chunks.length ? chunks[chunks.length - 1].end : 1;

  // 시간 조각 배경(번갈아 색칠)과 경계선
  chunks.forEach((c, i) => {
    const x0 = c.start / duration * width;
    const x1 = c.end / duration * width;
    ctx.fillStyle = i % 2 ? '#eef2ff' : '#f8fafc';
    ctx.fillRect(x0, 0, x1 - x0, height);
    if (i > 0) {
      ctx.strokeStyle = '#a5b4fc'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(Math.round(x0) + 0.5, 0); ctx.lineTo(Math.round(x0) + 0.5, height); ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(width, mid); ctx.stroke();

  // 픽셀 열마다 최솟값·최댓값을 세로선으로 그려 파형이 사라지지 않게 한다
  ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x < width; x++) {
    const start = Math.floor(x / width * samples.length);
    const end = Math.min(samples.length, Math.max(start + 1, Math.floor((x + 1) / width * samples.length)));
    let low = 0; let high = 0;
    for (let i = start; i < end; i++) { low = Math.min(low, samples[i]); high = Math.max(high, samples[i]); }
    ctx.moveTo(x + 0.5, mid - high * scale); ctx.lineTo(x + 0.5, mid - low * scale);
  }
  ctx.stroke();

  // 음절 글자
  ctx.fillStyle = '#0f172a'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  labels.forEach((label, i) => {
    const x = (i + 0.5) / labels.length * width;
    ctx.fillText(label, x, 6);
  });
}

/** '매출 표를 캡처한 사진'. 글씨가 작아 조각으로 나누면 숫자가 뭉개진다. */
export const TABLE_ROWS = [['월', '매출'], ['1월', '980만 원'], ['2월', '1,130만 원'], ['3월', '1,280만 원']];

export function drawTable(ctx, size) {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
  const s = size / 300;
  ctx.save(); ctx.scale(s, s);
  const left = 34; const top = 58; const rowH = 46; const colW = [96, 136];
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2;
  TABLE_ROWS.forEach((row, r) => {
    let x = left;
    row.forEach((cell, c) => {
      ctx.fillStyle = r === 0 ? '#e2e8f0' : '#ffffff';
      ctx.fillRect(x, top + r * rowH, colW[c], rowH);
      ctx.strokeRect(x + 0.5, top + r * rowH + 0.5, colW[c], rowH);
      ctx.fillStyle = '#0f172a';
      ctx.font = `${r === 0 ? 'bold ' : ''}15px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cell, x + colW[c] / 2, top + r * rowH + rowH / 2);
      x += colW[c];
    });
  });
  ctx.fillStyle = '#64748b'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('screenshot.png', left, 30);
  ctx.restore();
}
