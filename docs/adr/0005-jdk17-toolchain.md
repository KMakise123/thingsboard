---
status: superseded (by [0006](0006-jdk25-toolchain.md) — 用户自装 JDK 25 后全量回滚)
---

# 工具链：本机 JDK 17 编译（上游 master 要求 Java 25）

上游 master（4.4.0-SNAPSHOT）根 pom 将 `maven.compiler` 定为 **25**；本机仅有 JDK 17.0.4.1（2026-08-31），用户裁决不安装 JDK 25、以 17 编译运行。

## Considered Options

- **安装 Temurin JDK 25（否决）**：用户明确选择不下载，维持现有 17 工具链。
- **切到仍支持 17 的上游 LTS 分支（否决）**：fork 定位于 master 线，不降版本。

## 决策要点

1. **根 pom 三处 25 → 17**：`maven-compiler-plugin` 的 `<release>` 与 `maven.compiler.source/target` 属性（编译事实由 `<release>` 决定）。
2. **主代码仅一处 Java 21 API**：`TbHttpClient.java:516` `values.getFirst()` → `values.get(0)`（`List.getFirst()` 是 Java 21 的 SequencedCollection API）。其余 grep 命中均为 `Comparator.reversed()`（Java 8）或 TB 自家 `Pair.getFirst()`，无需处理。
3. **测试编译整体跳过**：`-Dmaven.test.skip=true`。测试代码使用 Java 22 的 `_` 匿名变量语法（如 `TbRestApiCallNodeTest.java:235`），17 无法编译；跑测试需先修这些点或回到 JDK 22+。
4. **本地运行链路**（均在 gitignored `local/` 下）：`env.sh`（数据源口令，同 `.mcp.json`：`postgres/123456`）+ `install-db.sh` / `run-backend.sh`。三个已知坑都在脚本内自愈：classpath 59KB 超 Windows 命令行上限→java @argfile（且 argfile 内反斜杠是转义符，路径必须转正斜杠）；dev 安装期望 `application/src/main/data/sql/`（仅 Gradle 打包会从 dao resources 拷入）→脚本自动补拷；`-Dpkg.skip=true` 跳过 `build-info.properties` 生成而安装器要读它→脚本自动 `mvn spring-boot:build-info`。

## Consequences

- 跑后端、装库、REST 全链路在本机 17 下验证可用（登录/鉴权 API 实测通过）。
- **上游测试套件不可运行**（编译期即失败）；待需要时二选一：批量修 `_` 用法，或引入 JDK 25 工具链。
- 后续合入上游安全补丁若引入新的 21+ API/语法，按本 ADR 第 2 条先例逐处机械修补；若密度过高，重开决策升级 JDK。
- 回滚路径：还原 pom 三处版本号与 `getFirst()` 一行即回到上游基线。
