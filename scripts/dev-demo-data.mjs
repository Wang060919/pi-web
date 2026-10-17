import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const DEFAULT_SESSION_ID = "019d7e3a-5c10-7a41-8f2e-0a1b2c3d4e01";
const SESSION_IDS = Array.from({ length: 8 }, (_, index) => `${DEFAULT_SESSION_ID.slice(0, -2)}${String(index + 1).padStart(2, "0")}`);
const MODELS = [
  { provider: "openai", model: "gpt-5.4", api: "openai-responses" },
  { provider: "anthropic", model: "claude-sonnet-4-5", api: "anthropic-messages" },
];

function assertInside(root, path) {
  const suffix = relative(root, path);
  if (suffix === "" || suffix === ".." || suffix.startsWith(`..${sep}`) || isAbsolute(suffix)) {
    throw new Error(`Demo data path must be inside ${root}: ${path}`);
  }
}

async function ensureDirectory(path) {
  let created = false;
  try {
    await mkdir(path, { mode: 0o700 });
    created = true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  if (!(await lstat(path)).isDirectory()) throw new Error(`Demo directory must not be a symbolic link: ${path}`);
  return created;
}

async function ensureNestedDirectory(root, path) {
  assertInside(root, path);
  let current = root;
  let created = false;
  for (const part of relative(root, path).split(sep)) {
    current = join(current, part);
    created = await ensureDirectory(current);
  }
  return created;
}

async function writeMissing(root, path, contents) {
  assertInside(root, path);
  await ensureNestedDirectory(root, dirname(path));
  try {
    await writeFile(path, contents, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (!(await lstat(path)).isFile()) throw new Error(`Existing demo file must not be a symbolic link: ${path}`);
    return false;
  }
}

function usage(index = 1) {
  const input = 650 + index * 137;
  const output = 160 + index * 41;
  const cacheRead = index * 83;
  const cacheWrite = index * 19;
  return { input, output, cacheRead, cacheWrite, totalTokens: input + output + cacheRead + cacheWrite,
    cost: { input: 0.002, output: 0.004, cacheRead: 0.0001, cacheWrite: 0.0002, total: 0.0063 } };
}

function transcript({ id, name, cwd, date, model = MODELS[0], parentSession }) {
  const base = date.getTime();
  const entries = [{ type: "session", version: 3, id, timestamp: date.toISOString(), cwd,
    ...(parentSession === undefined ? {} : { parentSession }) }];
  let parentId = null;
  let counter = 0;
  const entry = (type, fields) => {
    counter += 1;
    const next = { type, id: counter.toString(16).padStart(8, "0"), parentId,
      timestamp: new Date(base + counter * 1800).toISOString(), ...fields };
    entries.push(next);
    parentId = next.id;
    return next.id;
  };
  const user = (text) => entry("message", { message: { role: "user", content: [{ type: "text", text }], timestamp: base + (counter + 1) * 1800 } });
  const assistant = (text, thinking) => entry("message", { message: {
    role: "assistant", content: [...(thinking === undefined ? [] : [{ type: "thinking", thinking }]), { type: "text", text }],
    ...model, usage: usage(counter), stopReason: "stop", timestamp: base + (counter + 1) * 1800,
    ...(thinking === undefined ? {} : { thinkingLevel: "medium" }),
  } });
  const tool = (name, args, text, options = {}) => {
    const callId = `demo_${id.slice(-2)}_${String(counter + 1)}`;
    entry("message", { message: { role: "assistant", content: [{ type: "toolCall", id: callId, name, arguments: args }],
      ...model, usage: usage(counter), stopReason: "toolUse", timestamp: base + (counter + 1) * 1800 } });
    return entry("message", { message: { role: "toolResult", toolCallId: callId, toolName: name,
      content: [{ type: "text", text }], isError: options.isError === true, timestamp: base + (counter + 1) * 1800,
      ...(options.details === undefined ? {} : { details: options.details }),
    } });
  };
  entry("model_change", { provider: model.provider, modelId: model.model });
  entry("thinking_level_change", { thinkingLevel: "medium" });
  entry("session_info", { name });
  return { entries, entry, user, assistant, tool, text: () => `${entries.map((item) => JSON.stringify(item)).join("\n")}\n` };
}

const DASHBOARD_BEFORE = `export interface UsageCard {\n  title: string;\n  value: number;\n}\n\nexport function formatTokens(value: number): string {\n  return String(value);\n}\n\nexport const cards: UsageCard[] = [\n  { title: "今日 Token", value: 128640 },\n  { title: "本周会话", value: 24 },\n];\n`;
const DASHBOARD_AFTER = DASHBOARD_BEFORE.replace("return String(value);", "return new Intl.NumberFormat(\"zh-CN\", { notation: \"compact\", maximumFractionDigits: 1 }).format(value);");
const DASHBOARD_DIFF = `--- a/src/dashboard.ts\n+++ b/src/dashboard.ts\n@@ -4,7 +4,7 @@\n }\n \n export function formatTokens(value: number): string {\n-  return String(value);\n+  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);\n }\n`;

async function initializeDemoRepository(root, cwd, modifiedFile, modifiedContents) {
  // These repositories are newly created by this invocation. Ignore inherited
  // Git routing/configuration and hooks so no user repository can be affected.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" });
  const git = (args) => run("git", ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false",
    "-c", "user.name=PI WEB Demo", "-c", "user.email=demo@example.invalid", ...args], { cwd, env, timeout: 10_000 });
  await git(["init", "--initial-branch=main"]);
  await git(["add", "."]);
  await git(["commit", "--no-verify", "--message", "Add synthetic demo workspace"]);
  const path = join(cwd, modifiedFile);
  assertInside(root, path);
  if (!(await lstat(path)).isFile()) throw new Error(`Demo file must not be a symbolic link: ${path}`);
  await writeFile(path, modifiedContents, "utf8");
}

async function seedWorkspace(root, project, files, modifiedFile, modifiedContents) {
  const created = await ensureNestedDirectory(root, project.path);
  for (const [path, contents] of Object.entries(files)) await writeMissing(root, join(project.path, path), contents);
  if (created) await initializeDemoRepository(root, project.path, modifiedFile, modifiedContents);
}

async function readProjectStore(path) {
  try {
    if (!(await lstat(path)).isFile()) throw new Error(`Project store must not be a symbolic link: ${path}`);
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  }
}

async function registerProjects(root, proposed) {
  const path = join(root, "state", "projects.json");
  await ensureNestedDirectory(root, dirname(path));
  const original = await readProjectStore(path);
  const contents = original === undefined ? { projects: [] } : JSON.parse(original);
  if (contents === null || typeof contents !== "object" || !Array.isArray(contents.projects)
    || contents.projects.some((project) => project === null || typeof project !== "object" || typeof project.id !== "string" || typeof project.path !== "string")) {
    throw new Error("Invalid development project store");
  }
  let changed = false;
  const projects = proposed.map((candidate) => {
    const byPath = contents.projects.find((project) => project.path === candidate.path);
    if (byPath !== undefined) return byPath;
    if (contents.projects.some((project) => project.id === candidate.id)) throw new Error(`Demo project id already belongs to another path: ${candidate.id}`);
    contents.projects.push(candidate);
    changed = true;
    return candidate;
  });
  if (!changed) return projects;
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(contents, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  try {
    if (await readProjectStore(path) !== original) throw new Error("Development projects changed while seeding; no project entries were overwritten. Retry demo setup.");
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary);
    throw error;
  }
  return projects;
}

/** Seed only this checkout's isolated development state; preserve existing files. */
export async function seedDevelopmentDemo(repoRoot) {
  const repository = await realpath(resolve(repoRoot));
  await ensureDirectory(join(repository, ".local"));
  const root = join(repository, ".local", "dev");
  await ensureDirectory(root);
  const workspaceRoot = join(root, "demo-workspaces");
  await ensureNestedDirectory(root, workspaceRoot);
  const today = new Date();
  const dateFor = (daysAgo) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo, 2));
  const proposed = [
    { id: "pi-web-demo-dashboard", name: "演示 · 数据看板", path: join(workspaceRoot, "dashboard"), createdAt: dateFor(18).toISOString() },
    { id: "pi-web-demo-notes", name: "演示 · 知识实验室", path: join(workspaceRoot, "notes-lab"), createdAt: dateFor(13).toISOString() },
  ];
  await seedWorkspace(root, proposed[0], {
    "README.md": "# 数据看板演示\n\n此目录和会话均为合成测试数据，用于展示 PI WEB 界面。\n\n- `src/dashboard.ts`：Token 指标与格式化示例\n- `src/dashboard.test.ts`：示例断言\n- `docs/design.md`：设计说明\n\n历史中的工具输出是预先生成的展示内容。实际文件可在文件面板浏览，本地 Git 面板可查看未提交差异。\n",
    "src/dashboard.ts": DASHBOARD_BEFORE,
    "src/dashboard.test.ts": "import { strict as assert } from \"node:assert\";\n\nassert.equal(new Intl.NumberFormat(\"zh-CN\", { notation: \"compact\", maximumFractionDigits: 1 }).format(128640), \"12.9万\");\n",
    "docs/design.md": "# 指标展示\n\n| 指标 | 展示格式 |\n| --- | --- |\n| Token | 中文紧凑数字 |\n| 会话 | 整数 |\n\n```mermaid\nflowchart LR\n  Session[会话记录] --> Usage[聚合用量]\n  Usage --> Cards[指标卡片]\n```\n",
    ".gitignore": "node_modules/\n",
  }, "src/dashboard.ts", DASHBOARD_AFTER);
  await seedWorkspace(root, proposed[1], {
    "README.md": "# 知识实验室\n\nPI WEB 合成演示项目：长对话、上下文压缩、分支和技能说明。\n\n本文档是示例材料，无须安装任何扩展或连接模型服务即可浏览已保存的历史。\n",
    "docs/guide.md": "# 项目操作指南\n\n1. 在左侧切换演示会话。\n2. 在消息上展开工具参数、结果与推理示例。\n3. 使用文件、Git 和 Mermaid 面板查看示例工作区。\n",
    "examples/skill-checklist.md": "# 技能演示清单\n\n- 阅读当前任务与输入边界\n- 生成最小修改\n- 记录实际验证\n\n这是静态展示材料，不包含可执行技能或插件。\n",
  }, "docs/guide.md", "# 项目操作指南\n\n1. 在左侧切换演示会话。\n2. 在消息上展开工具参数、结果与推理示例。\n3. 使用文件、Git 和 Mermaid 面板查看示例工作区。\n4. 用对话时间线跳转到较早消息。\n");
  const projects = await registerProjects(root, proposed);
  const sessionRoot = join(root, "sessions");
  await ensureNestedDirectory(root, sessionRoot);
  const scenarios = [
    { name: "欢迎体验 · Markdown 与图表", project: projects[0], days: 0, model: MODELS[0] },
    { name: "文件编辑 · read / edit / bash", project: projects[0], days: 1, model: MODELS[1] },
    { name: "错误排查 · 从失败到修复", project: projects[0], days: 3, model: MODELS[0] },
    { name: "方案比较 · 推理与模型展示", project: projects[0], days: 5, model: MODELS[1] },
    { name: "重构分支 · 保留变更与验证", project: projects[1], days: 2, model: MODELS[0] },
    { name: "长对话 · 上下文压缩与时间线", project: projects[1], days: 8, model: MODELS[1] },
    { name: "技能与插件 · 工作流说明", project: projects[1], days: 11, model: MODELS[0] },
    { name: "文档整理 · Mermaid 与交付清单", project: projects[1], days: 16, model: MODELS[1] },
  ];
  const sessions = [];
  for (const [index, scenario] of scenarios.entries()) {
    const id = SESSION_IDS[index];
    const date = dateFor(scenario.days);
    const fileName = `${date.toISOString().replaceAll(":", "-")}_${id}.jsonl`;
    const path = join(sessionRoot, fileName);
    const t = transcript({ id, name: scenario.name, cwd: scenario.project.path, date, model: scenario.model });
    if (index === 0) {
      t.user("我想快速看看 PI WEB 的测试数据展示：聊天、工具、文件和用量都能看吗？");
      t.assistant("## 欢迎来到 PI WEB 演示工作区\n\n这里提供 **2 个项目、8 个场景**，用于检查测试版的界面与交互。所有会话内容、Token 与工具输出均为合成测试数据。\n\n| 场景 | 可以查看 |\n| --- | --- |\n| 文件编辑 | `read`、`edit`、`bash` 的参数与结果 |\n| 错误排查 | 失败信息与修复记录 |\n| 方案比较 | 可展开的推理示例、不同模型 |\n| 长对话 | 时间线与上下文压缩 |\n| 技能与插件 | 操作说明与 Markdown 图表 |\n\n```mermaid\nflowchart LR\n  A[选择演示项目] --> B[打开会话]\n  B --> C[查看工具与推理]\n  B --> D[文件与 Git 面板]\n  B --> E[用量概览]\n```\n\n> 展示历史不需要配置 API Key。发送新消息需要自行配置模型；这些历史中的工具调用不会重新执行。");
      t.user("先帮我定位文件和用量面板。");
      t.assistant("左侧切换到 **演示 · 数据看板**；右侧 Files 面板可以浏览 `src/dashboard.ts`，Git 面板有一个未提交的格式化改动。欢迎页的用量概览会读取这些示例会话，展示多个日期与模型的合成 Token 分布。\n\n也可以打开 **文件编辑 · read / edit / bash**，观察完整的工具调用展示。");
    } else if (index === 1) {
      t.user("把看板里的 Token 数字改成中文紧凑格式，并检查输出。");
      t.tool("read", { path: "src/dashboard.ts", offset: 1, limit: 30 }, DASHBOARD_BEFORE);
      t.assistant("数据和渲染可以保留原样，只修改 `formatTokens` 的显示格式。");
      t.tool("edit", { path: "src/dashboard.ts", oldText: "return String(value);", newText: "return new Intl.NumberFormat(\"zh-CN\", { notation: \"compact\", maximumFractionDigits: 1 }).format(value);" },
        "Successfully replaced text in src/dashboard.ts.", { details: { diff: DASHBOARD_DIFF, firstChangedLine: 7 } });
      t.tool("bash", { command: "node --experimental-strip-types src/dashboard.test.ts" }, "✓ 128640 → 12.9万\n✓ 24 → 24\n2 checks passed (synthetic demo output)");
      t.assistant("已在示例代码中展示中文紧凑数字格式：`128640 → 12.9万`。\n\n这是预先生成的工具记录；实际未提交改动可在 Git 面板对照查看。");
    } else if (index === 2) {
      t.user("页面说配置文件找不到，帮我看看原因。");
      t.tool("read", { path: "config/dashboard.json" }, "ENOENT: no such file or directory, open 'config/dashboard.json'", { isError: true });
      t.assistant("错误指向一个不存在的配置路径。我先查看目录与源码中实际使用的位置。");
      t.tool("bash", { command: "rg --files src docs" }, "src/dashboard.ts\nsrc/dashboard.test.ts\ndocs/design.md");
      t.tool("read", { path: "src/dashboard.ts" }, DASHBOARD_AFTER);
      t.assistant("原因是示例任务引用了不存在的 `config/dashboard.json`；当前指标直接定义在 `src/dashboard.ts`。已找到正确入口。\n\n- 红色工具结果保留原始错误。\n- 后续成功记录用于对照恢复过程。\n- 此会话不修改真实配置，也不创建凭据。");
    } else if (index === 3) {
      t.user("Token 数字该显示完整数值还是 12.9万？帮我比较一下。");
      t.assistant("推荐卡片使用 **12.9万**，详细视图保留 **128,640**。\n\n| 形式 | 优点 | 适合位置 |\n| --- | --- | --- |\n| 128,640 | 精确，可直接核对 | 详情、导出 |\n| 12.9万 | 简洁，便于扫读 | 概览卡片 |\n\n下面的折叠内容用于测试推理区域的排版，属于手工编写的公开示例说明。", "【合成推理展示】先比较概览卡片的阅读负担与核对精度，再按位置选择表示方式。概览强调数量级，详情强调可复核；因此采用两种展示层级。");
      t.user("移动端也保持这样吗？");
      t.assistant("保持相同规则。小屏卡片显示紧凑数字，点进详情后显示完整数值；模型和推理级别控件可用于检查不同宽度下的布局。");
    } else if (index === 4) {
      t.user("整理操作指南，先给一个重构方案，再保留另一个分支作比较。");
      const forkPoint = t.assistant("建议按“打开项目 → 查看消息 → 使用面板 → 验证结果”的顺序组织，先保留当前说明作为共同起点。");
      t.user("分支 A：写成一整段操作说明。");
      const discarded = t.assistant("分支 A：打开演示项目后选择会话，查看消息中的工具结果，然后通过右侧面板浏览文件和差异，最后回到欢迎页查看用量。");
      t.entry("branch_summary", { parentId: forkPoint, fromId: discarded, summary: "分支 A 已比较：整段文字紧凑，但步骤不够清楚。改用分支 B 的编号清单。", usage: usage(3) });
      t.user("分支 B：还是用编号清单，并加上时间线入口。");
      t.tool("read", { path: "docs/guide.md" }, "# 项目操作指南\n\n1. 在左侧切换演示会话。\n2. 在消息上展开工具参数、结果与推理示例。\n3. 使用文件、Git 和 Mermaid 面板查看示例工作区。\n4. 用对话时间线跳转到较早消息。\n");
      t.assistant("采用分支 B：\n\n1. 选择项目与会话。\n2. 展开工具参数与结果。\n3. 查看 Files 与 Git 面板。\n4. 使用右侧对话时间线跳转。\n\n会话树保留了先前分支，方便对照这次结构调整。");
    } else if (index === 5) {
      const topics = ["需求范围", "欢迎页", "导航入口", "文件浏览", "工具参数", "错误提示", "数字格式", "移动布局", "键盘操作", "主题切换", "模型选择", "用量说明"];
      let firstKeptEntryId;
      for (const [number, topic] of topics.entries()) {
        const userId = t.user(`第 ${String(number + 1)} 轮：检查${topic}，给我一条可核对的记录。`);
        if (number === 8) firstKeptEntryId = userId;
        t.assistant(`### ${topic}\n\n本轮展示记录：内容使用中文，关键路径有明确入口，并保留原始工具输出或具体数值供核对。\n\n- 当前检查项：**${topic}**\n- 结果：演示记录已整理\n- 数据来源：合成测试场景`);
      }
      t.entry("compaction", { summary: "## 会话摘要\n\n已逐项查看需求、导航、文件、工具、错误、数字格式与小屏布局。约定所有数据标明为合成演示，保留原始错误与可核对数值。接下来检查主题、模型和用量。", firstKeptEntryId, tokensBefore: 28450, usage: usage(5) });
      t.user("压缩后继续，给我最终检查清单。");
      t.assistant("上下文压缩已保存摘要，前面的历史仍可浏览。\n\n- [x] 欢迎页与导航\n- [x] 成功和失败工具记录\n- [x] 长消息与时间线\n- [x] 多模型与多个日期用量\n- [ ] 新消息的真实模型执行需另行配置与验证\n\n这段长会话用于测试滚动、历史加载、时间线和压缩标记展示。");
    } else if (index === 6) {
      t.user("演示一下技能和插件的协作方式，不要安装新东西。");
      t.tool("read", { path: "examples/skill-checklist.md" }, "# 技能演示清单\n\n- 阅读当前任务与输入边界\n- 生成最小修改\n- 记录实际验证\n\n这是静态展示材料，不包含可执行技能或插件。");
      t.assistant("## 技能与插件\n\n**技能**提供任务步骤；**插件面板**展示项目数据。这个示例只保存说明文字，不安装或执行新的技能。\n\n| 内容 | 演示入口 |\n| --- | --- |\n| 技能清单 | Files → `examples/skill-checklist.md` |\n| 代码与文档 | Files 面板 |\n| 未提交变更 | Git 面板 |\n| 流程图 | Markdown 中的 Mermaid 代码块 |\n\n```mermaid\nsequenceDiagram\n  participant U as 使用者\n  participant S as 技能步骤\n  participant P as 已有面板\n  U->>S: 明确目标与边界\n  S->>P: 浏览文件和差异\n  P-->>U: 展示可核对结果\n```");
    } else {
      t.user("整理演示功能的交付清单，并画出数据流。");
      t.assistant("## 演示交付清单\n\n| 项目 | 内容 |\n| --- | --- |\n| 数据看板 | Markdown、工具成功/失败、数字格式与推理说明 |\n| 知识实验室 | 分支、长对话、压缩、技能与插件说明 |\n| 数据隔离 | `.local/dev` 内的测试项目和会话 |\n| 重复生成 | 保留已有会话和已编辑文件 |\n\n```mermaid\nflowchart TD\n  Seed[本地演示数据] --> JSONL[SDK v3 会话文件]\n  Seed --> Workspace[示例工作区]\n  JSONL --> Chat[聊天与时间线]\n  JSONL --> Usage[用量概览]\n  Workspace --> Files[文件面板]\n  Workspace --> Git[Git 差异]\n```\n\n所有历史工具输出和用量均为合成示例，用来检查展示效果。");
    }
    // Stable IDs also make a later run on a different day preserve the original
    // transcript instead of creating another file with the same session ID.
    const existing = await findExistingTranscript(sessionRoot, id, scenario.project.path);
    const sessionPath = existing ?? path;
    if (existing === undefined) await writeMissing(root, path, t.text());
    const session = { id, name: scenario.name, cwd: scenario.project.path, projectId: scenario.project.id, path: sessionPath };
    sessions.push({ ...session, url: sessionUrl(session) });
  }
  const defaultSession = sessions[0];
  return { url: defaultSession.url, projects, defaultSession, sessions };
}

function sessionUrl(session) {
  // Both the folder fallback and bundled Git provider use the project path as
  // their workspace key (workspaceProviderRegistry / git/server-plugin).
  const workspaceId = createHash("sha1").update(`${session.projectId}:${session.cwd}`).digest("hex").slice(0, 12);
  const query = new URLSearchParams({ project: session.projectId, workspace: workspaceId, session: session.id, view: "chat" });
  return `?${query.toString()}`;
}

async function findExistingTranscript(root, id, cwd) {
  const matches = (await readdir(root)).filter((name) => name.endsWith(`_${id}.jsonl`)).sort();
  if (matches.length === 0) return undefined;
  if (matches.length > 1) throw new Error(`Multiple development transcripts already use demo session id ${id}`);
  const path = join(root, matches[0]);
  if (!(await lstat(path)).isFile()) throw new Error(`Existing demo session must not be a symbolic link: ${path}`);
  const handle = await open(path, "r");
  let header;
  try {
    const buffer = Buffer.alloc(16 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    try {
      header = JSON.parse(buffer.toString("utf8", 0, bytesRead).split("\n", 1)[0]);
    } catch {
      throw new Error(`Existing demo session has an invalid header; it was preserved: ${path}`);
    }
  } finally {
    await handle.close();
  }
  if (header?.type !== "session" || header.id !== id || header.cwd !== cwd) {
    throw new Error(`Existing demo session id or workspace conflicts; it was preserved: ${path}`);
  }
  return path;
}
