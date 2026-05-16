# Subagent-Driven Development 实操教程

## 这是什么？

Subagent-Driven Development 是一种执行实施计划的方法。核心理念：

1. **每个 Task 派一个新的 subagent** — 上下文隔离，不会相互干扰
2. **每个 Task 经过两道审查** — 规格审查（是否按计划做了）→ 代码质量审查（是否做得好）
3. **连续执行** — 不停下来问进度，一鼓作气完成所有 Task

## 角色分工

| 角色 | 职责 | 用什么模型 |
|------|------|-----------|
| **Controller（我）** | 读计划、派 subagent、回答问题、协调流程 | 当前模型 |
| **Implementer（实现者）** | 写代码、写测试、提交 | 便宜/标准模型 |
| **Spec Reviewer** | 检查是否按计划实现，不多不少 | 标准模型 |
| **Code Quality Reviewer** | 检查代码质量、安全、性能 | 强模型 |

## 执行流程

```
读取计划 → 提取所有 Task → 创建 Todo

对每个 Task：
  ┌─ 派 Implementer subagent（给完整的 Task 内容和上下文）
  │
  ├─ Implementer 问问题了？
  │   └─ 是 → 我回答问题 → 回去继续
  │   └─ 否 → 继续
  │
  ├─ Implementer 执行完成（写代码、测试、提交、自审）
  │   状态：DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
  │
  ├─ 派 Spec Reviewer（检查是否按计划实现）
  │   ├─ 通过 ✅ → 继续
  │   └─ 不通过 ❌ → Implementer 修 → 重新审查
  │
  ├─ 派 Code Quality Reviewer（检查代码质量）
  │   ├─ 通过 ✅ → 继续
  │   └─ 不通过 ❌ → Implementer 修 → 重新审查
  │
  └─ 标记 Task 完成 ✅

所有 Task 完成后 → 最终代码审查 → 完成
```

## 实际操作演示

以下是在这个跨境电商助手项目中的实际操作方式。

### Step 1: 我会先读计划，创建 Task 列表

比如我们的计划有这些 Task：

```
Task 0.1: 初始化 Tauri 项目
Task 0.2: 创建基础布局和路由
Task 1.1: 实现统一 LLM 客户端
Task 2.1: 创建翻译 store 和 LLM 调用
Task 2.2: 实现划词翻译页面
...
```

我会用 TaskCreate 把它们全列出来。

### Step 2: 派第一个 Implementer

我会这样派 subagent（你看不到具体调用，但效果是这样的）：

```
我 > Agent: "你是 implementer，任务：初始化 Tauri 项目。

这是你的 Task 原文：

### Task 0.1: 初始化 Tauri 项目
**Files:** Create: 整个项目骨架

Step 1: 使用 Tauri CLI 创建项目
  运行: npm create tauri-app@latest cc_ds_kj -- --template react-ts

Step 2: 安装依赖
  运行: npm install

...（完整 Task 内容）

注意：
- 你在 E:/files/cc_ds_kj 目录下工作
- 这是一个跨境电商助手桌面应用
- 使用 Tauri 2.x + React + TypeScript"
```

### Step 3: Implementer 可能会问问题

```
Implementer > "这个目录已经有一些文件（docs/、.superpowers/），
             我是创建新项目还是在这个目录里初始化？"
```

我会回答，然后继续。

### Step 4: Implementer 执行、测试、提交

```
Implementer > 完成。我做了：
  - 创建了 Tauri 项目骨架
  - 安装了所有依赖
  - 验证了 tauri dev 可以运行
  - 提交: "feat: initialize Tauri project scaffold"

  自审：所有步骤按计划完成，无额外修改。
  状态: DONE
```

### Step 5: 我会派 Spec Reviewer

```
我 > Agent: "你是 spec reviewer，审查这个提交。
  计划原文是 Task 0.1（附上完整内容）。
  检查成果是否：
  1. 覆盖了计划中所有要求
  2. 没有多做计划外的事情
  3. 文件路径和计划一致"
```

### Step 6: Spec Reviewer 审查

```
Reviewer > ✅ Spec 合规。
  所有文件按要求创建，路径正确，没有多做或少做。
```

### Step 7: 派 Code Quality Reviewer

```
我 > Agent: "你是 code quality reviewer。
  审查刚才的提交，重点看：
  - 代码结构是否清晰
  - 是否有安全隐患
  - 依赖版本是否合理"
```

### Step 8: Code Quality Reviewer 审查

```
Reviewer > ✅ 通过。项目结构标准，无安全问题。
```

### Step 9: 标记完成，开始下一个 Task

```
我 > Task 0.1 完成 ✅
  开始 Task 0.2...
  （重复 Step 2-8）
```

## 四个状态的处理方式

Implementer 完成后的状态：

| 状态 | 含义 | 我该怎么做 |
|------|------|-----------|
| **DONE** | 顺利完成 | 进入审查流程 |
| **DONE_WITH_CONCERNS** | 完成了但有疑虑 | 先读疑虑，如果合理就处理，否则继续审查 |
| **NEEDS_CONTEXT** | 缺少信息 | 补充信息，重新派 |
| **BLOCKED** | 做不下去了 | 分析原因，可能拆分 Task 或换更强模型 |

## 你会看到什么

执行过程中你会看到的：

1. **进度更新**：我会告诉你当前在执行哪个 Task
2. **文件变化**：新文件会出现，代码在增加
3. **问题/决定**：如果 Implementer 遇到需要你决策的问题，我会转达

你不会看到的：

1. Subagent 之间的详细对话（太多了，没必要）
2. 每个步骤的完整输出（只汇总关键结果）

## 关键原则

**不要做的事：**
- ❌ 同时派多个 implementer（会产生代码冲突）
- ❌ 跳过审查直接开始下一个 Task
- ❌ Spec 审查没通过就开始 Code Quality 审查
- ❌ 审查发现问题了但不修就直接过

**必须做的事：**
- ✅ 每个 Task 给完整内容（不让 subagent 自己去读计划文件）
- ✅ 提供足够的上下文（这个 Task 在整个项目中的位置）
- ✅ Implementer 问了问题必须回答
- ✅ 审查发现问题 → 修 → 重新审查 → 通过了再继续

## 现在开始？

你已了解完整流程。要开始执行计划吗？我会：

1. 先读取计划，提取所有 Task
2. 创建 Todo 跟踪进度
3. 从 Task 0.1 开始，逐个执行

只需回复「开始」就行。

---

*这份教程是基于 `superpowers:subagent-driven-development` skill 的内容结合实际项目写的。*
