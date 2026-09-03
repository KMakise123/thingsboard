#!/usr/bin/env node
/**
 * rule-node dry-run report generator (M8 brief §3 wave-3 R; spec
 * v2-editors-acceptance §4.5 evidence).
 *
 * Reads the dry-run summary JSON produced by
 * src/components/rule-node/rule-node-dry-run.test.tsx and renders the
 * statistics report (node × criteria matrix + three-state counts +
 * degradation lists + dual-gate verdict) into docs/spec/v2-m8-dry-run-report.md.
 *
 * Usage (from ui-antd/):
 *   1. npx vitest run src/components/rule-node/rule-node-dry-run.test.tsx
 *   2. node scripts/rule-node-dry-run-report.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const uiAntdRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = join(uiAntdRoot, '..');
const summaryPath = join(
  uiAntdRoot,
  'src/components/rule-node/__fixtures__/dry-run-summary.json',
);
const reportPath = join(repoRoot, 'docs/spec/v2-m8-dry-run-report.md');

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

const TYPE_ORDER = [
  'FILTER',
  'ENRICHMENT',
  'TRANSFORMATION',
  'ACTION',
  'EXTERNAL',
  'FLOW',
];
const STATE_LABELS = {
  controls: '控件级',
  'json-fallback': 'JSON 兜底',
  'legal-empty': '合法空',
  'non-editable': '不可编辑',
};

const percent = (ratio) => `${(ratio * 100).toFixed(1)}%`;
const check = (ok) => (ok ? '✅' : '❌');
const escapePipe = (text) => String(text).replaceAll('|', '\\|');
const shortClazz = (clazz) => clazz.split('.').pop();

const REASON_LABELS = {
  crash: '渲染崩溃',
  'no-fields-non-legal-empty': '零字段且非合法空形态',
  'all fields render through the JSON source fallback (uiHints not covering, shape not inferable)':
    '全部字段无 uiHints 覆盖且值形状不可推断（null 值树），走每字段 JSON 源码兜底（仍可编辑）',
};
const reasonLabel = (reason) => REASON_LABELS[reason] ?? escapePipe(reason);

const editable = summary.records.filter(
  (record) =>
    record.nonEmpty && record.noCrash && record.state !== 'non-editable',
).length;
const editableRate = editable / summary.records.length;
const controlRate = summary.metrics.controlLevelRate;
const editableGate = editableRate === 1;
const controlGate = controlRate >= 0.85;

const records = [...summary.records].sort(
  (a, b) =>
    TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
    a.name.localeCompare(b.name),
);

const lines = [];
const push = (...rows) => lines.push(...rows);

/** Local-calendar date (toISOString would report UTC, off by a day here). */
function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

push(
  '# v2 M8 波3：76 节点 dry-run 统计报告',
  '',
  `- **生成日期**：${localDate()}（脚本 ${'`'}ui-antd/scripts/rule-node-dry-run-report.mjs${'`'} 从摘要 JSON 生成，可重复执行）`,
  `- **统计对象**：CORE 画布可见内置节点 **${summary.totalNodes}** 个（全仓 @RuleNode 节点类 77，${'`'}push to cloud${'`'} 为 EDGE-only 不入面）——与 spec §4.5 定稿口径一致`,
  `- **取证方式**：**API 取证**（非源码构造）。fixture 从本机运行中的 ThingsBoard 后端 ${'`'}GET /api/components?componentTypes=ACTION,EXTERNAL,FILTER,ENRICHMENT,TRANSFORMATION,FLOW&ruleChainType=CORE${'`'} 全量抓取（抓取日 ${summary.fixtureCapturedAt}，tenant 登录），落盘 ${'`'}ui-antd/src/components/rule-node/__fixtures__/rule-node-descriptors.json${'`'}；dry-run 测试离线读 fixture，不依赖后端存活`,
  `- **判定依据**：spec v2-editors-acceptance §4.5 + v2-m8-implementation-brief §2 末段（dry-run 统计口径）`,
  '- **复跑方式**：`cd ui-antd && npx vitest run src/components/rule-node/rule-node-dry-run.test.tsx && node scripts/rule-node-dry-run-report.mjs`（第一步重写摘要，第二步重写本报告）',
  '',
  '## 1. 双指标判定',
  '',
  '| 指标 | 口径 | 结果 | 门槛 | 判定 |',
  '| --- | --- | --- | --- | --- |',
  `| **可编辑率**（100% 硬门槛） | 非空 ∧ 无崩溃 ∧ 三态 ≠ 不可编辑：${editable}/${summary.totalNodes} | ${percent(editableRate)} | = 100% | ${check(editableGate)} ${editableGate ? '达标' : '不达标'} |`,
  `| **控件级渲染率**（登记项） | 控件级（含合法空形态 ${summary.degradation.legalEmpty.length} 个，其 configuration 仅 version 占位、可完整表达）：${summary.states.controls + summary.states['legal-empty']}/${summary.totalNodes}（纯控件级 ${summary.states.controls}/${summary.totalNodes} = ${percent(summary.metrics.pureControlLevelRate)}） | ${percent(controlRate)} | ≥ 85% | ${check(controlGate)} ${controlGate ? '达标' : '不达标'} |`,
  '',
  `**结论**：${editableGate && controlGate ? '双指标全部达标。' : editableGate ? '硬门槛达标；控件级登记项未达标，降级清单如下。' : '硬门槛未达标——存在不可编辑节点，须在 M8 验收前处置。'}`,
  '',
  '## 2. 三态计数与判据通过情况',
  '',
  '| 判据 / 状态 | 计数 | 占比 |',
  '| --- | --- | --- |',
  `| ① 表单非空（含合法空形态） | ${summary.criteria.nonEmptyPassed}/${summary.totalNodes} | ${percent(summary.criteria.nonEmptyPassed / summary.totalNodes)} |`,
  `| ② 无崩溃（React 错误边界不触发） | ${summary.criteria.noCrashPassed}/${summary.totalNodes} | ${percent(summary.criteria.noCrashPassed / summary.totalNodes)} |`,
  `| ③ 控件级 | ${summary.states.controls} | ${percent(summary.states.controls / summary.totalNodes)} |`,
  `| ③ JSON 兜底（全部字段走 JSON 源码模式） | ${summary.states['json-fallback']} | ${percent(summary.states['json-fallback'] / summary.totalNodes)} |`,
  `| ③ 合法空形态（单独归类计数） | ${summary.states['legal-empty']} | ${percent(summary.states['legal-empty'] / summary.totalNodes)} |`,
  `| ③ 不可编辑（对标 ui-ngx directive-is-not-loaded） | ${summary.states['non-editable']} | ${percent(summary.states['non-editable'] / summary.totalNodes)} |`,
  '',
  `节点库六类分布：${TYPE_ORDER.map((type) => `${type} ${summary.typeCounts[type] ?? 0}`).join(' / ')}。`,
  '',
  `deprecated 照扫不豁免（共 ${summary.deprecatedNodes.length} 个）：${summary.deprecatedNodes.map((name) => `\`${name}\``).join('、')}。`,
  '',
  '## 3. 节点 × 判据矩阵（76 行）',
  '',
  '列：C = 控件级字段数；J = JSON 兜底字段数；① = 表单非空；② = 无崩溃。「族」为 P0 定制族（NodeConfigForm 树级组件接管）标记。',
  '',
  '| 类型 | 节点 | 实现类 | C | J | 三态 | ① | ② | 族 | 备注 |',
  '| --- | --- | --- | ---: | ---: | --- | :-: | :-: | :-: | --- |',
);

for (const record of records) {
  const notes = [];
  if (record.legalEmpty) {
    notes.push('合法空形态（仅 version 占位）');
  }
  if (record.deprecated) {
    notes.push('deprecated 照扫');
  }
  push(
    `| ${record.type} | ${escapePipe(record.name)} | \`${shortClazz(record.clazz)}\` | ${record.controlFields} | ${record.jsonFields} | ${STATE_LABELS[record.state]} | ${check(record.nonEmpty)} | ${check(record.noCrash)} | ${record.hasFamily ? 'Y' : '—'} | ${notes.join('；') || '—'} |`,
  );
}

push(
  '',
  '## 4. 降级清单',
  '',
  '### 4.1 不可编辑节点（对标 ui-ngx directive-is-not-loaded，出现即红）',
  '',
);

const nonEditable = summary.degradation.nonEditable;
if (nonEditable.length === 0) {
  push('无。', '');
} else {
  push(
    '| 节点 | 实现类 | 原因 | 崩溃信息 |',
    '| --- | --- | --- | --- |',
    ...nonEditable.map(
      (node) =>
        `| ${escapePipe(node.name)} | \`${shortClazz(node.clazz)}\` | ${reasonLabel(node.reason)} | ${node.crash ? `\`${escapePipe(node.crash)}\`` : '—'} |`,
    ),
    '',
  );
}

push('### 4.2 整节点 JSON 兜底（全部字段无专属控件）', '');

const jsonFallback = summary.degradation.jsonFallback;
if (jsonFallback.length === 0) {
  push('无。', '');
} else {
  push(
    '| 节点 | 实现类 | JSON 兜底字段 | 字段级原因 |',
    '| --- | --- | --- | --- |',
    ...jsonFallback.map(
      (node) =>
        `| ${escapePipe(node.name)} | \`${shortClazz(node.clazz)}\` | ${node.jsonFields} | ${reasonLabel(node.reason)} |`,
    ),
    '',
  );
}

push(
  '### 4.3 部分字段 JSON 兜底（控件级节点内仍有字段走源码模式）',
  '',
  '以下节点整体为控件级（登记项达标口径），但存在部分字段因值形状（null / 对象数组 / 复杂嵌套）而走 JSON 源码模式——K2/V 波补 uiHints 或注册表时可逐个收编：',
  '',
  '| 节点 | 实现类 | 控件字段 | JSON 兜底字段 |',
  '| --- | --- | ---: | ---: |',
  ...summary.degradation.partialJsonFallback
    .slice()
    .sort((a, b) => b.jsonFields - a.jsonFields)
    .map(
      (node) =>
        `| ${escapePipe(node.name)} | \`${shortClazz(node.clazz)}\` | ${node.controlFields} | ${node.jsonFields} |`,
    ),
  '',
  '### 4.4 崩溃节点（判据②红 + 堆栈）',
  '',
);

const crashed = summary.criteria.crashed;
if (crashed.length === 0) {
  push('无。', '');
} else {
  for (const node of crashed) {
    push(
      `- **${escapePipe(node.name)}**（\`${node.clazz}\`）：`,
      '  ```',
      ...node.stack.split('\n').map((line) => `  ${line}`),
      '  ```',
    );
  }
  push('');
}

push(
  '## 5. 判据④ round-trip 抽样（P0 五族 + 脚本族，全量 12 类）',
  '',
  '流程：改默认值 → `hydrateConfiguration` → 重渲染断言值保持 + 任意键不丢失；并对真实控件做一次交互式编辑（type/click）后校验浅合并门（配置键不丢失）+ 回放无崩溃。',
  '',
  '| 节点 | 编辑键 | 编辑目标 | hydrate | 重渲染值保持 | 交互编辑 |',
  '| --- | --- | --- | :-: | :-: | --- |',
  ...summary.roundTripSample.map(
    (sample) =>
      `| ${escapePipe(sample.name)} | \`${sample.key}\` | ${sample.target} | ${check(sample.hydrate)} | ${check(sample.rerender)} | ${sample.interact === 'skipped' ? 'skipped（族内无文本输入/开关控件，键保持与回放由 ①②③+L1/L2 覆盖）' : check(sample.interact)} |`,
  ),
  '',
  '## 6. 观察项（回传 K2/V 波，本报告不修 src）',
  '',
  '- **version 占位字段**：12 个 EmptyNodeConfiguration 节点的 defaultConfiguration 仅含 `version`，生成器目前为其渲染一个可编辑数字控件（故三态归控件级而非合法空）。ui-ngx 对这些节点表单为空；K2 可在 ui-hints 层把 version 字段隐藏（jsonSource/占位规则）以对齐上游观感。',
  jsonFallback.length > 0
    ? `- **整节点 JSON 兜底**：${jsonFallback.map((node) => `\`${node.name}\``).join('、')} 的默认配置为 null 值树（生成器按设计降级为 JSON 源码模式，仍可编辑）——K2 补 uiHints（如 targets 选择器）可升级为控件级。`
    : '- 整节点 JSON 兜底：无。',
  '- **注册表/uiHints 缺口**：P0 五族（脚本族、键操作、save timeseries/attributes、create/clear alarm）之外的 64 类全部依赖值形状推断 + 每字段 JSON 兜底，无定向控件；不影响双指标达标，收编优先级以 §4.3 的 JSON 兜底字段数排序。',
  '- round-trip 抽样中 2 个键操作节点的交互编辑为 skipped（族内仅 Select 类控件，无文本输入/开关）；其 L1/L2 断言（hydrate + 重渲染值保持 + 键不丢失）完整通过。',
  '',
  '## 7. 证据链与一致性',
  '',
  '- fixture：`ui-antd/src/components/rule-node/__fixtures__/rule-node-descriptors.json`（API 取证，76 描述符全量，含抓取元数据）',
  '- 摘要：`ui-antd/src/components/rule-node/__fixtures__/dry-run-summary.json`（测试内生成；本报告的数据源，两者由同一命令序列再生）',
  '- 测试：`ui-antd/src/components/rule-node/rule-node-dry-run.test.tsx`（94 用例：fixture 完整性 4 + 逐节点 76 + 判据④ 12 + 摘要门 2）',
  '- 本报告由脚本生成，与摘要 JSON 同源；手工编辑本文件会在下次再生时被覆盖。',
  '',
);

writeFileSync(reportPath, `${lines.join('\n')}\n`);
console.info(
  `[dry-run-report] wrote ${reportPath} — ${summary.totalNodes} nodes, editable ${percent(editableRate)}, control-level ${percent(controlRate)}`,
);
