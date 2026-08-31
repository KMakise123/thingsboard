---
status: accepted
---

# widget 运行时采用内置受控 React 组件集

前端重写（AntD Pro/React 替换 Angular ui-ngx）中，widget/仪表盘运行时不复刻 ui-ngx 的运行时 JIT 编译机制（`new Function` 控制器 + Angular 模板 JIT + SystemJS 外部模块，无沙箱），也不引入 JSON schema 通用解释器或运行时插件加载：采用**内置受控 React 组件集**——`typeFullFqn → lazy React 组件 + 类型元数据` 的注册表驱动渲染，dashboard 数据模型（`DashboardConfiguration`/`WidgetConfig`/datasource/alias JSON）原样消费不改动。原因：现有 widget descriptor 是 Angular 专属代码，在 React 中不可执行，「兼容现有 widget 定义」从来不是选项；单人全职 + v1 只读场景下，注册表方案渲染链路最短（无需拉取 widgetType descriptor、无运行时编译、无沙箱基建），demo 仪表盘直接可用，后端零新增契约。

## Considered Options

- **JSON schema 驱动通用渲染器**：等于发明并长期维护一门声明式 widget 语言；v1 没有用户自建 widget 的需求，成本不成立。
- **运行时插件加载（iframe / Web Components / Module Federation）**：服务的是自定义 widget（编辑器阶段需求），v1 只读不触发；且导入现有社区 widget 永久不可能（Angular 代码），沙箱只服务新写 widget，选型依赖编辑器阶段的范围认知。
- **兼容层桥接 Angular widget**：与整体重写矛盾，未列入认真候选。

## Consequences

- 系统 widget 类型需逐个用 React 重写（v1 覆盖集由地图「v1 范围与验收定案」圈定）；未覆盖的 `typeFullFqn` 在 v1 显示「暂未支持」占位符。
- **（#13 修订）注册表 resolver 链定案**：builtIn 命中 → 仓库 lazy 组件；miss → 拉 widgetType，`descriptor.runtime === 'react-1'` → 运行时编译注册为 custom；runtime 缺省（老 Angular）→ placeholder('angular-unsupported')；404 → placeholder('missing')。占位三态文案收敛在注册表层，渲染容器无感知。
- **（#13 修订）自定义（代码级）widget 扩展机制已定案**：Sucrase 同源编译管线 + `new Function` + require 白名单 shim + 同页预览，见 ADR 0004「代码级自定义 widget」。三接缝维持：注册表接口（内置/自定义/未来插件同一注册面）、窄数据契约（**定稿为 `CustomWidgetProps` interface，已封顶不加宽，新能力走 widget-kit 版本化**）、样式作用域（type 级 source.css 前缀 + 实例级 config.widgetCss 前缀双层注入）。
- **（#13 修订）布局用 react-grid-layout 2.x 主入口完全受控接入**：TB 特有语义（断点覆盖、mobile 单列栈、autofill 行高、SCADA 布局）自行计算后喂给 RGL；碰撞语义 = gridster `pushItems:false/swap:false` 的**碰撞阻挡**（compactor 系新 API + preventCollision 语义，精确形状以 PoC 实测 v2 d.ts 为准）；只读态以 `dragConfig`/`resizeConfig` 的 `enabled:false` 表达；RGL 只负责网格几何换算与容器观察，不使用其响应式自动布局。~~原「`compactType: null`、v1 全 static」措辞在 RGL 2.x（React 19 唯一可用线，1.x dist 含 findDOMNode）下失准，由本票修订。~~
- **（#13 修订）编辑器性能接缝**：渲染树按 widget 拆 memo 边界（`WidgetContainer` memo + config 引用订阅）；edit-mode/选中态走独立 context 通道，widget 主体不订阅——这是 v2 编辑器撤销性能承诺（O(改动子树) 重渲染）的结构前提。
- 数据层以 hook 形态重建 WidgetSubscription，复用 `api/ws` cmdId 协议；协议策略归地图「API 契约策略」票。

## References

- 决策票据：KMakise123/thingsboard#6（wayfinder 地图 #1「前端 AntD Pro 重写蓝图」）；修订：#13（RGL 2.x 措辞勘误、注册表 resolver 链、窄契约定稿、memo 边界接缝；文件由 0001 重编号为 0003——0002 已被并行会话的一步切换部署 ADR 占用）
- 事实基础：分支 `research/widget-runtime`（`research/widget-runtime.md`）
- 后续路线：ADR 0004（v2 编辑器三件套）
