// branchMap.js — 데모 3의 '답변 갈래 지도'.
// 질문에서 답변 갈래가 두 단계로 갈라지는 트리를 SVG로 그린다.
// 재료를 얹을 때마다 각 갈래로 흐르는 확률이 선 굵기·진하기·퍼센트로 갱신된다.

const NS = 'http://www.w3.org/2000/svg';

// 기하 상수 (viewBox 좌표계)
const W = 620;
const ROOT_X = 4;
const ROOT_W = 130;
const ROOT_H = 52;
const BRANCH_X = 184;
const BRANCH_W = 170;
const BRANCH_H = 46;
const LEAF_X = 404;
const LEAF_W = 208;
const LEAF_H = 42;
const LEAF_STEP = 52;
const LEAF_Y0 = 33;

function svg(tag, className = '', attrs = {}) {
  const node = document.createElementNS(NS, tag);
  if (className) node.setAttribute('class', className);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function text(className, x, y, str, anchor = 'start') {
  const t = svg('text', className, { x, y, 'text-anchor': anchor });
  t.textContent = str;
  return t;
}

/** 부모 오른쪽 가장자리 → 자식 왼쪽 가장자리를 잇는 완만한 곡선 */
function edgePath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

function fmtPct(p) {
  return p < 1 ? '<1%' : `${Math.round(p)}%`;
}

/**
 * container 안에 갈래 지도를 그리고 { update(probs) }를 돌려준다.
 * probs는 data.js의 branchProbs() 결과({ branch, leaf }, 단위 %).
 */
export function createBranchMap(container, branches, rootLines) {
  const leafTotal = branches.reduce((n, b) => n + b.leaves.length, 0);
  const height = LEAF_Y0 * 2 + (leafTotal - 1) * LEAF_STEP;
  const svgRoot = svg('svg', '', { viewBox: `0 0 ${W} ${height}` });

  // 선을 먼저, 노드를 나중에 그려 노드가 선의 끝을 덮게 한다
  const edgeLayer = svg('g');
  const nodeLayer = svg('g');
  svgRoot.appendChild(edgeLayer);
  svgRoot.appendChild(nodeLayer);

  // 질문 노드 (전체 세로 중앙)
  const rootY = height / 2;
  const rootG = svg('g', 'bm-node bm-root');
  rootG.appendChild(svg('rect', '', {
    x: ROOT_X, y: rootY - ROOT_H / 2, width: ROOT_W, height: ROOT_H, rx: 10,
  }));
  const lineY0 = rootY - ((rootLines.length - 1) * 17) / 2 + 4;
  rootLines.forEach((line, i) => {
    rootG.appendChild(text('bm-label', ROOT_X + ROOT_W / 2, lineY0 + i * 17, line, 'middle'));
  });
  nodeLayer.appendChild(rootG);

  const items = new Map(); // id → { edge, node, metaEl?, pctEl? }
  let leafIndex = 0;

  branches.forEach((b, bi) => {
    const leafYs = b.leaves.map((_, k) => LEAF_Y0 + (leafIndex + k) * LEAF_STEP);
    const by = (leafYs[0] + leafYs[leafYs.length - 1]) / 2;
    const cls = b.desired ? ' desired' : '';

    const bEdge = svg('path', `bm-edge${cls}`, {
      d: edgePath(ROOT_X + ROOT_W, rootY, BRANCH_X, by),
    });
    edgeLayer.appendChild(bEdge);

    const bG = svg('g', `bm-node bm-branch${cls}`);
    bG.appendChild(svg('rect', '', {
      x: BRANCH_X, y: by - BRANCH_H / 2, width: BRANCH_W, height: BRANCH_H, rx: 10,
    }));
    const meta = text('bm-meta', BRANCH_X + 13, by - 5, `갈래 ${bi + 1}`);
    bG.appendChild(meta);
    bG.appendChild(text('bm-label', BRANCH_X + 13, by + 13, b.label));
    nodeLayer.appendChild(bG);
    items.set(b.id, { edge: bEdge, node: bG, metaEl: meta, num: bi + 1 });

    b.leaves.forEach((leaf, k) => {
      const ly = leafYs[k];
      const lEdge = svg('path', `bm-edge${cls}`, {
        d: edgePath(BRANCH_X + BRANCH_W, by, LEAF_X, ly),
      });
      edgeLayer.appendChild(lEdge);

      const lG = svg('g', `bm-node bm-leaf${cls}${leaf.best ? ' best' : ''}`);
      lG.appendChild(svg('rect', '', {
        x: LEAF_X, y: ly - LEAF_H / 2, width: LEAF_W, height: LEAF_H, rx: 9,
      }));
      if (leaf.best) {
        lG.appendChild(text('bm-label', LEAF_X + 12, ly - 2, leaf.label));
        lG.appendChild(text('bm-best-tag', LEAF_X + 12, ly + 14, '내가 원한 최선'));
      } else {
        lG.appendChild(text('bm-label', LEAF_X + 12, ly + 4.5, leaf.label));
      }
      const pct = text('bm-pct', LEAF_X + LEAF_W - 12, ly + 4.5, '', 'end');
      lG.appendChild(pct);
      nodeLayer.appendChild(lG);
      items.set(leaf.id, { edge: lEdge, node: lG, pctEl: pct });
    });

    leafIndex += b.leaves.length;
  });

  container.appendChild(svgRoot);

  // 확률(%) → 물줄기 굵기·진하기. 거의 안 가는 노드는 옅게 가라앉힌다.
  function paint(item, p) {
    item.edge.style.strokeWidth = `${(1.2 + p * 0.16).toFixed(1)}px`;
    item.edge.style.opacity = Math.min(0.95, 0.3 + p * 0.008).toFixed(2);
    item.node.classList.toggle('bm-faint', p < 3);
  }

  return {
    update(probs) {
      for (const b of branches) {
        const item = items.get(b.id);
        paint(item, probs.branch[b.id]);
        item.metaEl.textContent = `갈래 ${item.num} · ${fmtPct(probs.branch[b.id])}`;
        for (const leaf of b.leaves) {
          const leafItem = items.get(leaf.id);
          paint(leafItem, probs.leaf[leaf.id]);
          leafItem.pctEl.textContent = fmtPct(probs.leaf[leaf.id]);
        }
      }
    },
  };
}
