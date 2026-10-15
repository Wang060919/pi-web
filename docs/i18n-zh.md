# 简体中文与 English 界面语言

设置 → 常规 → 语言支持跟随浏览器、English、简体中文。偏好以 `pi-web.locale` 存在当前浏览器的 localStorage；跟随浏览器不保存覆盖值。浏览器首选语言为 `zh`/`zh-*` 时选简体中文，其余为 English。应用语言会刷新整页，使模块初始化时生成的操作标签和独立插件一起重新加载。

## 代码与资源

- `src/shared/i18nCore.ts`：语言选择、静态模板适配器，无第三方依赖。
- `src/shared/i18n.ts`：主界面入口，提供 `t`、`localizedTemplate`、`localizedText`、语言偏好 API。
- `src/shared/locales/en.ts`、`zh-CN.ts`：主界面独立语言资源。
- 插件各自的 `i18n.ts`、`locales/`：包内资源。Git 与 Workflows 的资源在 `browser/` 内，以满足 `browserRoot` 资源边界。
- 插件的 `i18nCore.ts` 是自动生成副本，各副本实时读取同一个 storage key，不缓存语言状态。

业务协议、角色/状态枚举、路由、命令、文件路径保持原值；展示时再映射标签。用户对话、模型输出、文件内容、终端输出和工具值不进入翻译。服务端诊断和可由用户定制的插件文本仍可能为 English。

## 添加或更新翻译

普通字符串在对应 `locales/en.ts`、`zh-CN.ts` 的 `messages` 中添加相同 key，调用 `t("settings.example")`。新 key 使用稳定的语义名称；迁移的旧 key 带原文件名和短哈希，后续编辑文案不必改 key。TypeScript 检查字符串 key 与中英文资源是否完整。中文资源缺失时回退英文，再回退 key。

Lit 模板使用 ``localizedTemplate("component.example", html)`...` ``，普通字符串模板使用 ``localizedText("component.example")`...` ``。源码保留一份原始英文模板及全部业务表达式；中文 `templates` 条目仅存静态片段和原值的索引，不复制组件逻辑。不要翻译插值值或绑定到用户内容。

可运行以下命令打印指定模板的英文源信息：

```sh
node scripts/i18n-template.mjs src/client/src/components/Example.ts component.example
```

将 `sourceHash`、`valueCount`、`strings`、`order` 写入中文 `templates`，翻译 `strings` 的可见文本和可访问性标签，保留 HTML 结构、属性、事件绑定位置及转义。输出的 `expressions` 仅用于核对，不写入资源。`strings.length` 必须为 `order.length + 1`；`order` 指向原英文表达式的位置，中文语序调整或省略复数后缀时可重排/省略对应文本插值。事件处理器、属性绑定和用户内容必须保持对应关系。

修改英文模板的静态内容后，更新中文模板和源指纹。运行时校验源指纹、原值数量、片段数量及索引范围；资源过期或结构无效时保留原英文模板和绑定。测试会把未同步的条目标为失败，避免静默交付过期翻译。

## 同步与检查

修改 canonical runtime 后同步所有插件副本：

```sh
node scripts/i18n-sync.mjs
node scripts/i18n-sync.mjs --check
npx vitest run src/shared/i18n.test.ts scripts/i18n-resources.test.mjs src/client/src/components/settings/SettingsLanguagePanel.test.ts
npm run typecheck
npm run lint
```

新增独立插件时，在其实际 `browserRoot` 内放置语言资源与 runtime，并将目录加入 `scripts/i18n-sync.mjs` 的列表。浏览器插件资源不能通过 `../` 越过其 `browserRoot`；Files、Terminal、Mermaid 有独立 bundle，其他插件主要原样转译。无需修改生产安装目录或用户 Pi 配置。
