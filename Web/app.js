/**
 * 移动端 Tab 切换逻辑
 */
function switchTab(tabId) {
  // 1. 设置全局 active-tab 属性（由 CSS 控制显隐和动画）
  document.body.dataset.activeTab = tabId;

  // 2. 切换底部导航状态
  const navItems = document.querySelectorAll('.nav-item');
  const tabList = ['overview', 'actions', 'funds', 'settings'];

  navItems.forEach((item, index) => {
    if (tabList[index] === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // 3. 切换后回到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const STORAGE_KEY = "simple-dca-state-v4";
const LEGACY_STORAGE_KEY = "simple-dca-state-v3";
const VALUATION_SOURCE_URL =
  "https://api.codetabs.com/v1/proxy/?quest=https://danjuanfunds.com/djapi/index_eva/dj?size=200";

const defaultRules = {
  dcaCycleDays: 7,
  coreRatio: 70,
  satelliteBuyBelow: 40,
  satelliteSellHalfAbove: 60,
  satelliteClearAbove: 80,
  coreHalfLow: 30,
  coreHalfHigh: 40,
  coreFullBelow: 30,
  coreSellAbove: 70,
  coreSellPercent: 30,
  dcaBatches: 6,
};

let indexOptions = [];

const fallbackValuations = [];

const defaultState = {
  availableCash: 0,
  rebalanceMonth: 11,
  actionHistory: [],
  rules: structuredClone(defaultRules),
  valuationUpdatedAt: "",
  valuations: structuredClone(fallbackValuations),
  funds: [
    {
      id: crypto.randomUUID(),
      name: "创业板指",
      indexCode: "399006",
      bucket: "core",
      pe: 0,
      value: 0,
    },
    {
      id: crypto.randomUUID(),
      name: "恒生科技指数",
      indexCode: "HKHSTECH",
      bucket: "satellite",
      pe: 0,
      value: 0,
    },
  ],
};

let state = loadState();
syncIndexOptions(state.valuations);

const els = {
  availableCash: document.querySelector("#availableCash"),
  accountValueSummary: document.querySelector("#accountValueSummary"),
  rebalanceMonth: document.querySelector("#rebalanceMonth"),
  dcaCycleDays: document.querySelector("#dcaCycleDays"),
  dcaBatches: document.querySelector("#dcaBatches"),
  coreRatio: document.querySelector("#coreRatio"),
  satelliteRatioSummary: document.querySelector("#satelliteRatioSummary"),
  satelliteBuyBelow: document.querySelector("#satelliteBuyBelow"),
  satelliteSellHalfAbove: document.querySelector("#satelliteSellHalfAbove"),
  satelliteClearAbove: document.querySelector("#satelliteClearAbove"),
  coreHalfLow: document.querySelector("#coreHalfLow"),
  coreHalfHigh: document.querySelector("#coreHalfHigh"),
  coreFullBelow: document.querySelector("#coreFullBelow"),
  coreSellAbove: document.querySelector("#coreSellAbove"),
  coreSellPercent: document.querySelector("#coreSellPercent"),
  resetRulesButton: document.querySelector("#resetRulesButton"),
  addFundButton: document.querySelector("#addFundButton"),
  exportDataButton: document.querySelector("#exportDataButton"),
  importDataButton: document.querySelector("#importDataButton"),
  importFileInput: document.querySelector("#importFileInput"),
  refreshValuationButton: document.querySelector("#refreshValuationButton"),
  valuationNotice: document.querySelector("#valuationNotice"),
  coreTarget: document.querySelector("#coreTarget"),
  coreTargetNote: document.querySelector("#coreTargetNote"),
  coreHolding: document.querySelector("#coreHolding"),
  satelliteTarget: document.querySelector("#satelliteTarget"),
  satelliteTargetNote: document.querySelector("#satelliteTargetNote"),
  satelliteHolding: document.querySelector("#satelliteHolding"),
  actionList: document.querySelector("#actionList"),
  undoButton: document.querySelector("#undoButton"),
  fundList: document.querySelector("#fundList"),
  fundTemplate: document.querySelector("#fundTemplate"),
  allocationChart: document.querySelector("#allocationChart"),
  allocationRatio: document.querySelector("#allocationRatio"),
  rebalanceAdvice: document.querySelector("#rebalanceAdvice"),
  historySection: document.querySelector("#historySection"),
  historyTimeline: document.querySelector("#historyTimeline"),
  ruleSettingsPanel: document.querySelector("#ruleSettingsPanel"),
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    const funds = Array.isArray(parsed.funds) ? parsed.funds.map(normalizeFund) : defaultState.funds;
    const valuations = Array.isArray(parsed.valuations) ? mergeValuations(parsed.valuations) : fallbackValuations;
    return {
      ...structuredClone(defaultState),
      ...parsed,
      rules: { ...defaultRules, ...(parsed.rules || {}) },
      valuations,
      funds,
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function syncIndexOptions(valuations = fallbackValuations) {
  indexOptions = [
    ...valuations
      .filter((item) => item.code && item.name)
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
      .map((item) => ({ code: item.code, name: item.name })),
    { code: "manual", name: "自定义 / 手动输入" },
  ];
}

function normalizeFund(fund) {
  const matchedIndex = matchIndexByText(`${fund.name || ""} ${fund.indexCode || ""}`);
  const indexCode = fund.indexCode || matchedIndex?.code || "manual";
  const valuation = fallbackValuations.find((item) => item.code === indexCode);
  return {
    id: fund.id || crypto.randomUUID(),
    name: indexCode === "manual" ? fund.name || "新基金" : valuation?.name || fund.name || "新基金",
    indexCode,
    bucket: fund.bucket === "satellite" ? "satellite" : "core",
    pe: toNumber(fund.pe),
    value: toNumber(fund.value),
    lastActionDate: fund.lastActionDate || null,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function percent(value) {
  const numeric = Number.isFinite(value) ? value : 0;
  return `${numeric.toFixed(1)}%`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(toNumber(value), min), max);
}

function getSatelliteRatio() {
  return Math.max(100 - clamp(state.rules.coreRatio, 1, 99), 1);
}

function getTargets() {
  const coreRatio = clamp(state.rules.coreRatio, 1, 99) / 100;
  const base = getCurrentCapitalBase();
  return {
    core: base * coreRatio,
    satellite: base * (1 - coreRatio),
  };
}

function getCurrentCapitalBase() {
  return getPortfolioValue() + Math.max(toNumber(state.availableCash), 0);
}

function getPortfolioValue() {
  return state.funds.reduce((sum, fund) => sum + toNumber(fund.value), 0);
}

function bucketName(bucket) {
  return bucket === "core" ? "核心仓" : "卫星仓";
}

function getBucketValue(bucket) {
  return state.funds
    .filter((fund) => fund.bucket === bucket)
    .reduce((sum, fund) => sum + toNumber(fund.value), 0);
}

function getValuation(code) {
  return state.valuations.find((item) => item.code === code) || fallbackValuations.find((item) => item.code === code);
}

function matchIndexByText(text) {
  const normalized = String(text).replace(/\s+/g, "").toLowerCase();
  return indexOptions.find((item) => {
    if (item.code === "manual") return false;
    return normalized.includes(item.code.toLowerCase()) || normalized.includes(item.name.toLowerCase());
  });
}

function syncFundPeFromIndex(fund) {
  const valuation = getValuation(fund.indexCode);
  if (!valuation) return false;
  fund.pe = valuation.pePercentile;
  fund.name = valuation.name;
  return true;
}

function getFundAdvice(fund) {
  return buildFundAdvice(fund, state.availableCash);
}

function buildFundAdvice(fund, cashLimit) {
  const rules = state.rules;
  const targets = getTargets();
  const bucketTarget = targets[fund.bucket];
  const bucketValue = getBucketValue(fund.bucket);
  const pe = toNumber(fund.pe);
  const value = toNumber(fund.value);

  if (!fund.name.trim()) {
    return holdAdvice(fund, "名称空着时，建议先补齐信息，避免后续看错操作对象。", ["信息待补全"]);
  }

  if (!pe && pe !== 0) {
    return holdAdvice(fund, "缺少 PE 百分位，先选择跟踪指数或手动填写 PE 百分位。", ["需要估值"]);
  }

  if (fund.bucket === "satellite") {
    if (pe > rules.satelliteClearAbove && value > 0) {
      return sellAdvice(
        fund,
        value,
        `卫星仓 PE 百分位超过 <strong>${rules.satelliteClearAbove}%</strong>，规则要求清仓离场，等待回落后重新布局。`,
      );
    }
    if (pe > rules.satelliteSellHalfAbove && value > 0) {
      return sellAdvice(
        fund,
        value * 0.5,
        `卫星仓 PE 百分位超过 <strong>${rules.satelliteSellHalfAbove}%</strong>，卖出一半仓位止盈。`,
      );
    }
    if (pe < rules.satelliteBuyBelow) {
      const remaining = Math.max(bucketTarget - bucketValue, 0);
      if (remaining > 0) {
        return buyAdvice(
          fund,
          remaining,
          cashLimit,
          `卫星仓 PE 百分位低于 <strong>${rules.satelliteBuyBelow}%</strong>，规则建议补足卫星仓位。`,
        );
      }
      return holdAdvice(fund, "卫星仓已接近目标仓位，低估时也不额外超配。");
    }
    return holdAdvice(fund, "卫星仓 PE 百分位未进入买入或止盈区间，继续持有观察。");
  }

  if (pe > rules.coreSellAbove && value > 0) {
    return sellAdvice(
      fund,
      value * (rules.coreSellPercent / 100),
      `核心仓 PE 百分位超过 <strong>${rules.coreSellAbove}%</strong>，卖出 <strong>${rules.coreSellPercent}%</strong> 仓位落袋为安。`,
    );
  }

  if (pe < rules.coreFullBelow) {
    const remaining = Math.max(bucketTarget - bucketValue, 0);
    if (remaining > 0) {
      return buyAdvice(fund, remaining, cashLimit, `核心仓低于 <strong>${rules.coreFullBelow}%</strong> 分位，打完剩余核心资金，拉满底仓。`);
    }
    return holdAdvice(fund, "核心仓已达目标仓位，低估时不再临时超配。");
  }

  if (pe >= rules.coreHalfLow && pe <= rules.coreHalfHigh) {
    const halfTarget = bucketTarget * 0.5;
    const remainingToHalf = Math.max(halfTarget - bucketValue, 0);
    if (remainingToHalf > 0) {
      return buyAdvice(
        fund,
        remainingToHalf,
        cashLimit,
        `核心仓处于 <strong>${rules.coreHalfLow}%</strong> 到 <strong>${rules.coreHalfHigh}%</strong> 分位，建议补足核心半仓目标。`,
      );
    }
    return holdAdvice(fund, `核心半仓目标已完成，等待低于 <strong>${rules.coreFullBelow}%</strong> 或年度再平衡信号。`);
  }

  return holdAdvice(fund, `核心仓 PE 百分位高于 <strong>${rules.coreHalfHigh}%</strong> 且未到止盈线，暂停新建仓，只持有观望。`);
}

function buyAdvice(fund, amount, cashLimit, detail) {
  if (fund.lastActionDate && state.rules.dcaCycleDays) {
    const daysSinceLastAction = (Date.now() - fund.lastActionDate) / (1000 * 3600 * 24);
    if (daysSinceLastAction < state.rules.dcaCycleDays) {
      const daysLeft = Math.ceil(state.rules.dcaCycleDays - daysSinceLastAction);
      const nextDate = new Date(fund.lastActionDate + state.rules.dcaCycleDays * 24 * 3600 * 1000);
      return holdAdvice(
        fund,
        `目前估值处于买入区间，但距离下次定投日（${nextDate.toLocaleDateString()}）还有 <strong>${daysLeft}</strong> 天，请耐心等待。`,
        ["等待定投日", bucketName(fund.bucket)],
      );
    }
  }

  return {
    type: "buy",
    fundId: fund.id,
    title: `买入 ${fund.name}`,
    detail: detail,
    amount: Math.round(amount),
    tags: ["买入", bucketName(fund.bucket)],
  };
}

function sellAdvice(fund, amount, detail) {
  const roundedAmount = Math.round(amount);
  return {
    type: "sell",
    fundId: fund.id,
    title: `卖出 ${fund.name}`,
    detail: `${detail} 建议卖出约 <strong>${money(roundedAmount)}</strong>。`,
    amount: roundedAmount,
    tags: ["卖出", bucketName(fund.bucket)],
  };
}

function holdAdvice(fund, detail, tags = ["持有", bucketName(fund.bucket)]) {
  return {
    type: "hold",
    fundId: fund.id,
    title: `持有 ${fund.name}`,
    detail,
    amount: 0,
    tags,
  };
}

function renderInputs() {
  els.availableCash.value = state.availableCash;
  els.rebalanceMonth.value = state.rebalanceMonth;
  Object.keys(defaultRules).forEach((key) => {
    els[key].value = state.rules[key];
  });
  els.satelliteRatioSummary.textContent = `${getSatelliteRatio()}%`;
}

function renderOverview() {
  const targets = getTargets();

  els.accountValueSummary.textContent = money(getPortfolioValue());
  els.coreTarget.textContent = money(targets.core);
  els.satelliteTarget.textContent = money(targets.satellite);
  els.coreHolding.textContent = money(getBucketValue("core"));
  els.satelliteHolding.textContent = money(getBucketValue("satellite"));
  els.coreTargetNote.textContent = `（${state.rules.coreRatio}%）`;
  els.satelliteTargetNote.textContent = `（${getSatelliteRatio()}%）`;
}

function renderFunds() {
  els.fundList.innerHTML = "";

  if (state.funds.length === 0) {
    els.fundList.innerHTML = '<div class="empty">还没有基金。先添加一只核心或卫星基金。</div>';
    return;
  }

  const advices = buildActionAdvices();
  state.funds.forEach((fund) => {
    const node = els.fundTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = fund.id;
    populateIndexSelect(node.querySelector("[data-role='indexSelect']"), fund.indexCode);
    node.querySelectorAll("[data-field]").forEach((field) => {
      field.value = fund[field.dataset.field] ?? "";
      if (field.dataset.field === "name" || field.dataset.field === "pe") {
        const locked = fund.indexCode !== "manual";
        field.readOnly = locked;
        field.classList.toggle("readonly-input", locked);
      }
      field.addEventListener("input", () => updateFund(fund.id, field.dataset.field, field.value, node));
      field.addEventListener("change", () => updateFund(fund.id, field.dataset.field, field.value, node));
    });
    node.querySelector("[data-action='remove']").addEventListener("click", () => removeFund(fund.id));
    renderFundResult(node.querySelector("[data-role='fundResult']"), fund, advices.find((advice) => advice.fundId === fund.id));
    els.fundList.appendChild(node);
  });
}

function populateIndexSelect(select, selectedCode) {
  select.innerHTML = indexOptions
    .map((item) => `<option value="${item.code}">${item.name}${item.code === "manual" ? "" : ` (${item.code})`}</option>`)
    .join("");
  select.value = selectedCode || "manual";
}

function renderFundResult(result, fund, advice = getFundAdvice(fund)) {
  const valuation = getValuation(fund.indexCode);
  const valuationTag = valuation
    ? `<span class="tag">PE ${valuation.pe} / 分位 ${percent(valuation.pePercentile)}</span>`
    : `<span class="tag">手动 PE ${percent(toNumber(fund.pe))}</span>`;
  result.innerHTML = `
    <div class="tag-row">
      ${advice.tags.map((tag) => `<span class="tag ${advice.type}">${tag}</span>`).join("")}
      ${valuationTag}
    </div>
    <p>${advice.detail}</p>
  `;
}

function refreshVisibleFundResults() {
  const advices = buildActionAdvices();
  state.funds.forEach((fund) => {
    const node = els.fundList.querySelector(`[data-id="${fund.id}"]`);
    if (!node) return;
    renderFundResult(node.querySelector("[data-role='fundResult']"), fund, advices.find((advice) => advice.fundId === fund.id));
  });
}

function renderActions() {
  const advices = buildActionAdvices();
  const priority = { sell: 0, buy: 1, hold: 2 };
  const sorted = [...advices].sort((a, b) => priority[a.type] - priority[b.type]);

  const hasHistory = Array.isArray(state.actionHistory) && state.actionHistory.length > 0;
  els.undoButton.style.display = hasHistory ? "" : "none";

  if (sorted.length === 0) {
    els.actionList.innerHTML = '<div class="empty">添加基金后，这里会生成下一步操作。</div>';
    return;
  }

  els.actionList.innerHTML = sorted
    .map(
      (advice) => `
        <article class="action-item ${advice.type}">
          <div class="action-item-header">
            <strong>${advice.title}</strong>
            <div class="tag-row">
              ${advice.tags.map((tag) => `<span class="tag ${advice.type}">${tag}</span>`).join("")}
            </div>
          </div>
          <p>${advice.detail}</p>
          ${advice.type === "buy" || advice.type === "sell"
          ? `<button class="ghost-button" style="margin-top: 12px; width: fit-content; padding: 6px 12px; font-size: 13px;" onclick="executeAction('${advice.fundId}', '${advice.type}', ${advice.amount})">确认已执行该操作</button>`
          : ""
        }
        </article>
      `,
    )
    .join("");
}

function buildActionAdvices() {
  const availableCash = Math.max(toNumber(state.availableCash), 0);
  const batches = Math.max(toNumber(state.rules.dcaBatches), 1);

  // 本期计划投入总预算 = 可用总资金 / 定投步数
  // 这解决了资金变动时的节奏问题：资金越多，每期投的绝对值越多
  const periodBudget = availableCash / batches;

  // 第一步：获取所有建议（买入建议此时是“理想金额”，即补齐缺口的金额）
  const rawAdvices = state.funds.map((fund) => buildFundAdvice(fund, Infinity));

  const buyAdvices = rawAdvices.filter((a) => a.type === "buy");
  const totalIdealGap = buyAdvices.reduce((sum, a) => sum + a.amount, 0);

  // 最终本期建议投入的总额，取 [本期预算] 和 [总缺口] 的较小值
  // 如果钱很多但缺口很小，就只买到目标为止
  const finalTotalBuy = Math.min(periodBudget, totalIdealGap);

  if (totalIdealGap === 0 || finalTotalBuy === 0) {
    return rawAdvices;
  }

  // 第二步：按比例分配 finalTotalBuy
  const scale = finalTotalBuy / totalIdealGap;
  return rawAdvices.map((advice) => {
    if (advice.type !== "buy") return advice;

    const scaledAmount = Math.round(advice.amount * scale);

    if (scaledAmount <= 0) {
      return {
        ...advice,
        type: "hold",
        title: `暂不买入 ${state.funds.find((f) => f.id === advice.fundId).name}`,
        detail: `${advice.detail} 理想买入 <strong>${money(advice.amount)}</strong>，但由于本期预算极其有限，分配金额不足 ¥1，建议先持有。`,
        amount: 0,
        tags: ["待买入", advice.tags[1]],
      };
    }

    // 如果没有被缩放（即资金充足），直接显示建议买入
    if (scaledAmount === advice.amount) {
      return {
        ...advice,
        detail: `${advice.detail} 本期建议买入 <strong>${money(scaledAmount)}</strong>。`,
      };
    }

    // 如果被缩放了，显示缩放逻辑
    return {
      ...advice,
      amount: scaledAmount,
      detail: `${advice.detail} 理想买入 <strong>${money(advice.amount)}</strong>，按可用资金及 <strong>${batches}</strong> 步定投节奏，本期分配买入 <strong>${money(scaledAmount)}</strong>。`,
    };
  });
}

function renderAllocation() {
  const core = getBucketValue("core");
  const satellite = getBucketValue("satellite");
  const total = core + satellite;
  const coreRatio = total > 0 ? (core / total) * 100 : 0;
  const satelliteRatio = total > 0 ? (satellite / total) * 100 : 0;

  els.allocationRatio.textContent = `${Math.round(coreRatio)}:${Math.round(satelliteRatio)}`;
  drawDonut(core, satellite);
  renderRebalanceAdvice(core, satellite);
}

function drawDonut(core, satellite) {
  const canvas = els.allocationChart;
  const ctx = canvas.getContext("2d");
  const total = core + satellite;

  // 优化高清屏锯齿
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = 200;
  const logicalHeight = 200;

  if (canvas.width !== logicalWidth * dpr) {
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;
  }

  const center = (logicalWidth * dpr) / 2;
  const radius = 84 * dpr;
  const width = 24 * dpr;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = width;
  ctx.lineCap = "round";

  // 背景圆环
  ctx.beginPath();
  ctx.strokeStyle = "#e6e1d5";
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (total <= 0) return;

  const start = -Math.PI / 2;
  const coreEnd = start + Math.PI * 2 * (core / total);

  // 核心仓
  ctx.beginPath();
  ctx.strokeStyle = "#147c64";
  ctx.arc(center, center, radius, start, coreEnd);
  ctx.stroke();

  // 卫星仓
  ctx.beginPath();
  ctx.strokeStyle = "#bc8420";
  // 增加微小间隙避免视觉粘连
  ctx.arc(center, center, radius, coreEnd + 0.04, start + Math.PI * 2 - 0.04);
  ctx.stroke();
}

function renderRebalanceAdvice(core, satellite) {
  const total = core + satellite;
  const currentMonth = new Date().getMonth();
  const isRebalanceMonth = currentMonth === Number(state.rebalanceMonth);

  if (total <= 0) {
    els.rebalanceAdvice.textContent = "录入持仓后，会显示是否偏离目标比例。";
    return;
  }

  const targetCore = total * (state.rules.coreRatio / 100);
  const diff = core - targetCore;
  const absDiff = Math.abs(diff);
  const ratioDrift = (absDiff / total) * 100;
  const timing = isRebalanceMonth ? "现在是你设定的再平衡月份。" : "未到年度再平衡月份，先记录偏离。";

  if (ratioDrift < 3) {
    els.rebalanceAdvice.textContent = `${timing} 当前偏离约 ${percent(ratioDrift)}，仓位接近目标比例。`;
    return;
  }

  if (diff > 0) {
    els.rebalanceAdvice.textContent = `${timing} 核心仓偏高，年度再平衡时可卖出核心约 ${money(absDiff)}，转入卫星仓。`;
  } else {
    els.rebalanceAdvice.textContent = `${timing} 卫星仓偏高，年度再平衡时可卖出卫星约 ${money(absDiff)}，转入核心仓。`;
  }
}


function renderValuationStatus() {
  const sourceCount = state.valuations.filter((item) => item.source !== "内置兜底").length;
  if (state.valuationUpdatedAt && sourceCount > 0) {
    const date = new Date(state.valuationUpdatedAt);
    const dateStr = `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    els.valuationNotice.className = "notice-box success";
    els.valuationNotice.textContent = `估值数据已于 ${dateStr} 更新，已自动匹配 ${sourceCount} 条指数 PE 百分位；未覆盖的指数可选择“自定义 / 手动输入”。`;
  } else {
    els.valuationNotice.className = "notice-box warning";
    els.valuationNotice.textContent = "暂未获取到最新公开估值数据，当前使用内置估值表；如 PE 百分位不准确，请手动修正。";
  }
}

function updateRootField(key, value) {
  state[key] = toNumber(value);
  saveState();
  render();
}

function updateRule(key, value) {
  state.rules[key] = key === "satelliteBatches" ? Math.max(Math.round(toNumber(value)), 1) : toNumber(value);
  if (key === "coreRatio") state.rules.coreRatio = clamp(state.rules.coreRatio, 1, 99);
  saveState();
  render();
}

function updateFund(id, key, value, node) {
  const fund = state.funds.find((item) => item.id === id);
  if (!fund) return;

  fund[key] = key === "name" || key === "bucket" || key === "indexCode" ? value : toNumber(value);
  if (key === "name" && fund.indexCode === "manual") {
    const matched = matchIndexByText(value);
    if (matched) fund.indexCode = matched.code;
  }
  if (key === "indexCode" && value !== "manual") syncFundPeFromIndex(fund);
  if (key === "indexCode" && value === "manual") {
    fund.name = "";
    fund.pe = "";
  }

  saveState();
  renderOverview();
  renderActions();
  renderAllocation();
  renderValuationStatus();
  if (node) {
    if (key === "name" || key === "indexCode") {
      const select = node.querySelector("[data-role='indexSelect']");
      if (select.value !== fund.indexCode) select.value = fund.indexCode;
      const peInput = node.querySelector("[data-field='pe']");
      const nameInput = node.querySelector("[data-field='name']");
      peInput.value = fund.pe;
      nameInput.value = fund.name;
      const locked = fund.indexCode !== "manual";
      nameInput.readOnly = locked;
      nameInput.classList.toggle("readonly-input", locked);
      peInput.readOnly = locked;
      peInput.classList.toggle("readonly-input", locked);
    }
    refreshVisibleFundResults();
  }
}

function removeFund(id) {
  const fund = state.funds.find(f => f.id === id);
  const fundName = fund ? (fund.name || "未命名基金") : "该基金";
  if (!confirm(`确定要删除“${fundName}”吗？删除后相关持仓数据将无法恢复。`)) return;

  state.funds = state.funds.filter((f) => f.id !== id);
  saveState();
  render();
}

function addFund() {
  state.funds.push({
    id: crypto.randomUUID(),
    name: "新基金",
    indexCode: "manual",
    bucket: "core",
    pe: 45,
    value: 0,
  });
  saveState();
  render();
}



function resetRules() {
  state.rules = structuredClone(defaultRules);
  saveState();
  render();
}

async function refreshValuations() {
  els.valuationNotice.className = "notice-box";
  els.valuationNotice.textContent = "正在刷新公开估值数据...";

  try {
    const response = await fetch(VALUATION_SOURCE_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("数据源响应异常");
    const json = await response.json();

    if (!json || !json.data || !json.data.items || json.data.items.length === 0) {
      throw new Error("未解析到估值数据");
    }

    const fresh = json.data.items.map((item) => ({
      code: item.index_code.replace(/^[A-Za-z]+(?=\d)/, ""),
      name: item.name,
      pe: toNumber(item.pe),
      pePercentile: toNumber(item.pe_percentile) * 100,
      source: "蛋卷基金",
    }));

    const uniqueFresh = [];
    const seen = new Set();
    for (const item of fresh) {
      if (!seen.has(item.code)) {
        seen.add(item.code);
        uniqueFresh.push(item);
      }
    }

    state.valuations = mergeValuations(uniqueFresh);
    syncIndexOptions(state.valuations);
    state.valuationUpdatedAt = new Date().toISOString();
    state.funds.forEach((fund) => {
      if (fund.indexCode !== "manual") syncFundPeFromIndex(fund);
    });
    saveState();
    render();
  } catch (err) {
    console.error(err);
    els.valuationNotice.className = "notice-box warning";
    els.valuationNotice.textContent = "公开估值数据获取失败，未配置内置估值表，如 PE 百分位不准确请手动修正。";
  }
}

function mergeValuations(fresh) {
  const byCode = new Map(fallbackValuations.map((item) => [item.code, item]));
  fresh.forEach((item) => byCode.set(item.code, item));
  return [...byCode.values()];
}

function bindEvents() {
  window.executeAction = function (fundId, type, amount) {
    const fund = state.funds.find((f) => f.id === fundId);
    if (!fund) return;

    if (!Array.isArray(state.actionHistory)) state.actionHistory = [];
    state.actionHistory.push({
      fundId,
      fundName: fund.name || "未命名基金",
      type,
      amount: Math.round(amount),
      previousValue: fund.value,
      previousLastActionDate: fund.lastActionDate || null,
      timestamp: Date.now(),
    });

    if (type === "buy") {
      fund.value += Math.round(amount);
    } else if (type === "sell") {
      fund.value = Math.max(0, fund.value - Math.round(amount));
    }

    // 统一更新最后操作日期，防止短期内重复提醒
    fund.lastActionDate = Date.now();

    saveState();
    render();
  };

  window.undoAction = function () {
    if (!Array.isArray(state.actionHistory) || state.actionHistory.length === 0) return;

    const lastAction = state.actionHistory.pop();
    const fund = state.funds.find((f) => f.id === lastAction.fundId);
    if (fund) {
      fund.value = lastAction.previousValue;
      fund.lastActionDate = lastAction.previousLastActionDate;
    }

    saveState();
    render();
  };

  [
    ["availableCash", "input"],
    ["rebalanceMonth", "change"],
  ].forEach(([key, eventName]) => {
    els[key].addEventListener(eventName, () => updateRootField(key, els[key].value));
  });

  Object.keys(defaultRules).forEach((key) => {
    els[key].addEventListener("input", () => updateRule(key, els[key].value));
  });

  els.addFundButton.addEventListener("click", addFund);
  els.refreshValuationButton.addEventListener("click", refreshValuations);
  els.resetRulesButton.addEventListener("click", resetRules);

  els.exportDataButton.addEventListener("click", () => {
    // 导出前进行数据瘦身，只保留用户数据
    const backup = structuredClone(state);
    delete backup.valuations;
    delete backup.valuationUpdatedAt;
    if (Array.isArray(backup.funds)) {
      backup.funds.forEach((fund) => {
        if (fund.indexCode !== "manual") delete fund.pe;
      });
    }

    const data = JSON.stringify(backup, null, 2);
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.clipboard) {
      navigator.clipboard.writeText(data).then(() => {
        alert("✅ 数据已复制到剪贴板！\n请粘贴并保存至您的备忘录或安全的地方。");
      }).catch(() => fallbackDownload(data));
    } else {
      fallbackDownload(data);
    }
  });

  function fallbackDownload(data) {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simple-dca-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  els.importDataButton.addEventListener("click", () => {
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      const input = prompt("请在此粘贴您的备份数据文本 (JSON)：");
      if (input) {
        try {
          const imported = JSON.parse(input);
          if (!imported.funds || !imported.rules) throw new Error("Invalid format");
          if (confirm("⚠️ 导入备份将覆盖当前所有持仓及规则设置，确定吗？")) {
            state = imported;
            saveState();
            location.reload();
          }
        } catch (e) {
          alert("❌ 导入失败：数据格式不正确");
        }
      }
    } else {
      els.importFileInput.click();
    }
  });

  els.importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.funds || !imported.rules) {
          throw new Error("Invalid format");
        }
        if (confirm("导入备份将覆盖当前所有持仓及规则设置，确定吗？")) {
          state = imported;
          saveState();
          location.reload();
        }
      } catch (err) {
        alert("导入失败：无效的备份文件。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
}

function render() {
  renderInputs();
  renderOverview();
  renderActions();
  renderHistory();
  renderAllocation();
  renderFunds();
  renderValuationStatus();
}

function renderHistory() {
  if (!Array.isArray(state.actionHistory) || state.actionHistory.length === 0) {
    els.historySection.style.display = "none";
    return;
  }

  els.historySection.style.display = "";

  // 只显示最近 10 条记录
  const sortedHistory = [...state.actionHistory].reverse().slice(0, 10);

  els.historyTimeline.innerHTML = sortedHistory.map(item => {
    const date = new Date(item.timestamp);
    const timeStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const typeLabel = item.type === "buy" ? "买入" : "卖出";

    return `
      <div class="timeline-item ${item.type}">
        <div class="timeline-content">
          <span class="timeline-time">${timeStr}</span>
          <div class="timeline-title">${typeLabel} ${item.fundName}</div>
          <div class="timeline-desc">金额：<strong>${money(item.amount)}</strong></div>
        </div>
      </div>
    `;
  }).join("");
}

function shouldAutoRefreshValuations() {
  const sourceCount = state.valuations.filter((item) => item.source !== "内置兜底").length;
  if (sourceCount < 18) return true;
  if (!state.valuationUpdatedAt) return true;
  const last = new Date(state.valuationUpdatedAt).getTime();
  if (!Number.isFinite(last)) return true;
  return Date.now() - last > 24 * 60 * 60 * 1000;
}

bindEvents();
render();
if (shouldAutoRefreshValuations()) {
  refreshValuations();
}

// 响应式：在手机端默认展开规则设置
if (window.innerWidth <= 768 && els.ruleSettingsPanel) {
  els.ruleSettingsPanel.open = true;
}

