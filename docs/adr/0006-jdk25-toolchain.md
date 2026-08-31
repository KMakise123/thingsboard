---
status: accepted
---

# 工具链：切换 JDK 25（恢复上游基线）

用户自行安装 Microsoft Build of OpenJDK 25.0.4（`D:\Program Files\Microsoft\jdk-25.0.4.101-hotspot`）后，[0005](0005-jdk17-toolchain.md) 的前提（本机仅 JDK 17）不复存在，其代价（测试套件锁定、上游补丁逐处修补）不再值得。

## 决策要点

1. **全量回滚 0005 的三处改动**：根 pom `<release>`/`maven.compiler.source`/`maven.compiler.target` 恢复为 25；`TbHttpClient.java:516` 恢复 `values.getFirst()`。回滚后 `git diff` 对上游基线为空。
2. **构建带测试编译**：`-DskipTests`（仅跳执行），不再 `-Dmaven.test.skip`——测试代码的 Java 22 `_` 匿名变量语法在 25 下可编译，套件恢复可用（跑法见仓库 `TEST_FAST.md`）。
3. **运行时绑定**：后端字节码为 release-25，运行必须用 JDK 25。系统 `PATH`/`JAVA_HOME` 仍首选 JDK 17，因此 `local/env.sh` 显式 `export JAVA_HOME` 指向 JDK 25 并前置其 `bin`——`local/` 两个脚本均 source 它，故脚本内 `java`/`mvn` 恒为 25。手工跑 maven 时需自带该 `JAVA_HOME`。
4. **0005 第 4 条的运行链路不变**：@argfile、sql 目录补拷、build-info 三坑仍由脚本自愈，与 JDK 版本无关。

## Consequences

- `local/` 脚本与运行链路保持单源：换 JDK 只改 `env.sh` 一行。
- 系统 Shell 里裸敲 `java`/`mvn`（不经过 local 脚本）仍是 17——IDE 或终端手工构建若忘了 `JAVA_HOME` 会报 "invalid target release: 25"，这是预期信号而非配置错误。
- 上游安全补丁合入不再有 21+ API 摩擦；若未来上游要求高于 25 的版本，按本 ADR 同样方式升级 `env.sh`。
