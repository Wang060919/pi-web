// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en';

export const messages: Record<keyof typeof englishMessages, string> = {
  "inspection.skills": "技能",
  "inspection.skillsNote": "浏览所选机器和工作区中已安装的技能。此目录不加载扩展、不修改文件；运行时动态添加的技能可在会话上下文详情中查看。",
  "inspection.untrusted": "项目尚未受信任，因此仅显示全局技能。",
  "inspection.refresh": "刷新",
  "inspection.loading": "加载中…",
  "inspection.searchSkills": "搜索技能",
  "inspection.noSkills": "没有匹配的技能。",
  "inspection.global": "全局",
  "inspection.project": "项目",
  "inspection.automatic": "允许模型自动调用",
  "inspection.manual": "仅显式调用",
  "inspection.skillContent": "技能内容",
  "inspection.selectSkill": "选择技能以阅读其说明。",
  "inspection.source": "来源",
  "inspection.skillHome": "技能主页",
  "inspection.preview": "预览",
  "inspection.raw": "源码",
  "inspection.markdownOnly": "这里只能打开该技能目录内的 Markdown 文档。",
  "inspection.open": "提示词与工具",
  "inspection.prompt": "系统提示词",
  "inspection.tools": "启用的工具",
  "inspection.runtimeNote": "当前运行时快照，可能包含尚未发送的改动。扩展的请求转换（包括隐藏工具声明）仍可能改变服务商收到的内容。执行一轮或重载会话后可刷新。",
  "inspection.unavailable": "无法检查该运行时。旧版本机器可能需要更新并重启会话守护进程。",
  "inspection.emptyPrompt": "当前系统提示词为空。",
  "inspection.noTools": "没有匹配的启用工具。",
  "inspection.searchTools": "搜索工具",

  "ui.tools.copyFailed": "无法复制到剪贴板。",
  "modelsSettings.clearKey": "清除配置密钥",
  "mcp.requestFailed": "MCP 请求失败",
  "mcp.configObject": "服务器配置必须是 JSON 对象",
  "mcp.confirmDelete": "删除 MCP 服务器",
  "mcp.scope.global": "全局",
  "mcp.scope.project": "项目",
  "mcp.configEnabled": "配置已启用",
  "mcp.configDisabled": "配置已停用",
  "mcp.overridden": "项目覆盖生效",
  "mcp.edit": "编辑",
  "mcp.disable": "停用",
  "mcp.enable": "启用",
  "mcp.test": "测试连接",
  "mcp.signIn": "登录",
  "mcp.signOut": "退出登录",
  "mcp.delete": "删除",
  "mcp.notTested": "尚未在此面板测试",
  "mcp.lastProbe": "上次连接测试",
  "mcp.tools": "工具",
  "mcp.probe.connected": "连接成功",
  "mcp.probe.needs-auth": "需要登录",
  "mcp.probe.failed": "连接失败",
  "mcp.probe.timeout": "连接超时",
  "mcp.name": "服务器名称",
  "mcp.scope": "配置范围",
  "mcp.configuration": "服务器配置（JSON）",
  "mcp.secretHelp": "凭据和参数已遮盖。保留此标记可沿用已有值；替换标记可更新该值：",
  "mcp.save": "保存",
  "mcp.cancel": "取消",
  "mcp.openAuthorization": "打开授权页面",
  "mcp.redirectUrl": "跳转后的网址",
  "mcp.continue": "继续",
  "mcp.redirectHelp": "请在浏览器完成授权。如果跳转的本机地址无法访问此机器，请将跳转后的完整网址粘贴到这里。",
  "mcp.login.starting": "正在开始登录",
  "mcp.login.waiting": "等待授权",
  "mcp.login.complete": "登录成功",
  "mcp.login.failed": "登录失败",
  "mcp.login.cancelled": "已取消登录",
  "mcp.reload": "刷新",
  "mcp.add": "添加服务器",
  "mcp.description": "管理 Pi MCP 服务器。查看配置不会启动服务器；连接测试仅启动所选服务器，测试结束后关闭。",
  "mcp.reloadHelp": "配置和测试结果不代表会话中的实时连接状态。修改 MCP 配置后，请在已有会话运行 /reload。",
  "mcp.trustHelp": "所选项目尚未受信任，已隐藏项目 MCP 配置并禁止连接测试。请先在工作区的信任设置中信任该项目。",
  "mcp.working": "处理中…",
  "mcp.empty": "尚未配置 MCP 服务器",
  "ui.settings.mcp": "MCP 服务器",
  "ui.tools.copyRaw": "复制原文",
  "ui.tools.writtenFiles": "本轮写入文件",
  "ui.quote.actions": "选中文字操作",
  "ui.quote.askHere": "添加到对话",
  "ui.quote.askNew": "在新会话中追问",
  "ui.quote.newSessionFailed": "新会话创建失败，引用内容已保留。",
  "ui.quote.unavailable": "输入框暂时不可用。",
  "ui.sessionExport.title": "导出会话为 HTML",
  "ui.sessionExport.failed": "会话导出失败",
  "ui.sessionSearch.workspaceUnavailable": "该工作区已不可用，仍可预览原始消息。",
  "ui.composer.inputHistory": "历史提示词",
  "ui.composer.inputHistoryHint": "↑ ↓ 选择 · Tab 填入 · Esc 关闭",
  "ui.composer.imageQuality": "图片质量",
  "ui.composer.imageOriginal": "原图",
  "ui.composer.imageCompressed": "压缩",
  "ui.composer.imageProcessing": "正在压缩…",
  "ui.composer.imageCompressionFailed": "图片压缩失败，已保留原图。",
  "ui.sessionSearch.title": "搜索聊天历史",
  "ui.sessionSearch.placeholder": "搜索消息正文…",
  "ui.sessionSearch.scope": "范围",
  "ui.sessionSearch.workspace": "当前工作区",
  "ui.sessionSearch.machine": "本机所有项目",
  "ui.sessionSearch.search": "搜索",
  "ui.sessionSearch.searching": "正在搜索…",
  "ui.sessionSearch.opening": "正在加载消息…",
  "ui.sessionSearch.instructions": "输入文字后搜索已保存的聊天记录。",
  "ui.sessionSearch.matches": "匹配",
  "ui.sessionSearch.scannedSessions": "已扫描会话",
  "ui.sessionSearch.results": "搜索结果",
  "ui.sessionSearch.noResults": "没有匹配的消息。",
  "ui.sessionSearch.truncated": "结果未完整显示，请缩小搜索范围。",
  "ui.sessionSearch.archived": "已归档",
  "ui.sessionSearch.searchFailed": "搜索失败",
  "ui.sessionSearch.openFailed": "无法打开此消息",
  "ui.sessionSearch.preview": "原始消息",
  "ui.sessionSearch.back": "返回结果",
  "ui.sessionSearch.locate": "在会话中定位",
  "ui.sessionSearch.locating": "正在定位消息…",
  "ui.sessionSearch.locateFailed": "无法在当前分支定位此消息，原始消息仍显示在下方。",
  "ui.sessionSearch.sourceRole": "角色",
  "modelsSettings.heading": "模型配置",
  "modelsSettings.description": "配置所选机器上的模型。连接测试会发送少量真实请求。",
  "modelsSettings.reload": "重新加载",
  "modelsSettings.loading": "正在加载模型配置…",
  "modelsSettings.save": "保存配置",
  "modelsSettings.saved": "已保存并刷新模型目录。已加载会话保留所选模型的信息；切换模型或新建会话后应用更新。",
  "modelsSettings.addProvider": "添加服务商",
  "modelsSettings.providerId": "服务商 ID",
  "modelsSettings.baseUrl": "接口地址",
  "modelsSettings.api": "API 协议",
  "modelsSettings.apiDefault": "使用服务商默认值",
  "modelsSettings.apiKey": "API 密钥或环境变量",
  "modelsSettings.keepSecret": "已存密钥不会显示，保持原值即可保留。",
  "modelsSettings.headers": "请求头（JSON 对象）",
  "modelsSettings.removeProvider": "移除服务商",
  "modelsSettings.addModel": "添加模型",
  "modelsSettings.discover": "发现模型",
  "modelsSettings.discoverHelp": "选择发现的模型，添加到草稿后再保存。",
  "modelsSettings.addSelected": "添加所选模型",
  "modelsSettings.modelId": "模型 ID",
  "modelsSettings.name": "显示名称",
  "modelsSettings.contextWindow": "上下文长度",
  "modelsSettings.maxTokens": "最大输出 token",
  "modelsSettings.reasoning": "推理能力",
  "modelsSettings.imageInput": "图像输入",
  "modelsSettings.removeModel": "移除模型",
  "modelsSettings.test": "测试连接",
  "modelsSettings.testHelp": "使用当前草稿测试且不保存。输出最多 16 token，20 秒超时。",
  "modelsSettings.testing": "正在测试…",
  "modelsSettings.testOk": "连接成功",
  "modelsSettings.noProviders": "尚未配置自定义服务商。",
  "modelsSettings.error": "操作失败",
  "modelsSettings.cost": "每百万 token 价格（JSON）",
  "modelsSettings.thinkingMap": "推理强度映射（JSON）",
  "modelsSettings.selectAll": "全选",
  "modelsSettings.busy": "处理中…",
  "modelsSettings.override": "覆盖内置模型",
  "modelsSettings.advanced": "高级模型选项",
  "modelsSettings.filter": "筛选发现的模型",
  "modelsSettings.truncated": "模型列表未完整返回。",
  "modelsSettings.refreshWarning": "已保存，但运行时刷新失败。请重新加载模型，或在合适时机重启会话守护进程。",
  "ui.usageOverview.title": "用量总览",
  "ui.usageOverview.open": "工作区概览",
  "ui.usageOverview.scope": "当前工作区",
  "ui.usageOverview.loading": "正在读取 Token 用量…",
  "ui.usageOverview.loadError": "暂时无法读取用量统计，请重试。",
  "ui.usageOverview.partial": "部分历史记录暂时无法读取，当前统计可能不完整。",
  "ui.usageOverview.retry": "重试",
  "ui.usageOverview.refresh": "刷新",
  "ui.usageOverview.refreshing": "正在刷新…",
  "ui.usageOverview.method": "会话按创建日期计数，消息与 Token 按实际发生日期统计；分叉继承的历史仅计一次，包含仍可读取的归档会话。",
  "ui.usageOverview.methodLabel": "统计口径",
  "ui.usageOverview.overview": "总览",
  "ui.usageOverview.models": "模型",
  "ui.usageOverview.range": "时间范围",
  "ui.usageOverview.all": "全部",
  "ui.usageOverview.days30": "30 天",
  "ui.usageOverview.days7": "7 天",
  "ui.usageOverview.sessions": "会话数",
  "ui.usageOverview.messages": "消息数",
  "ui.usageOverview.totalTokens": "总 Token",
  "ui.usageOverview.activeDays": "活跃天数",
  "ui.usageOverview.peakHour": "高峰时段",
  "ui.usageOverview.favoriteModel": "常用模型",
  "ui.usageOverview.heatmap": "每日 Token 用量",
  "ui.usageOverview.emptyModels": "开始对话后，这里会显示模型用量。",
  "ui.usageOverview.input": "输入",
  "ui.usageOverview.output": "输出",
  "ui.usageOverview.cacheRead": "缓存读取",
  "ui.usageOverview.cacheWrite": "缓存写入",
  "ui.usageOverview.tokens": "Token",
  "navigation.search": "搜索页面和工具",
  "navigation.search_placeholder": "搜索页面和工具…",
  "navigation.search_actions": "搜索页面和命令…",
  "navigation.close": "关闭",
  "navigation.destinations": "页面和工具",
  "navigation.description": "保留常用入口，其他页面可在这里打开，也可固定到标签栏。",
  "navigation.pinned": "已固定",
  "navigation.more_tools": "更多工具",
  "navigation.default_tabs": "精简入口",
  "navigation.show_all_tabs": "显示所有标签页",
  "navigation.mobile": "移动端导航",
  "navigation.expanded": "展开",
  "navigation.collapsed": "折叠",
  "navigation.more": "更多",
  "ui.welcome.title": "想做些什么？",
  "ui.welcome.start": "开始新会话",
  "ui.context.instructions": "已加载的指令",
  "ui.context.agents": "项目与用户指令",
  "ui.context.system": "系统提示来源",
  "ui.context.availableSkills": "可用技能",
  "ui.context.skillNote": "这里只列出可用技能，全文在需要时读取。",
  "ui.context.sourceNote": "这些是会话加载的资源，扩展仍可能调整最终提示。",
  "ui.context.unavailable": "当前会话未报告已加载的资源。更新并重启对应的会话守护进程后可查看。",
  "ui.context.unsupported": "当前运行时未提供这类来源。",
  "ui.context.none": "无",
  "ui.context.observed": "会话中的引用",
  "ui.context.historyNote": "仅根据浏览器已加载的消息整理；压缩后，引用内容可能已不在模型上下文中。",
  "ui.context.partial": "较早的消息尚未加载，因此列表不完整。",
  "ui.context.invoked": "已展开技能",
  "ui.context.read": "已完成读取",
  "ui.context.requested": "请求读取",
  "ui.context.failed": "读取失败",
  "ui.context.referenced": "文件引用",
  "ui.context.image": "图片附件",
  "ui.context.compacting": "正在压缩上下文…",
  "ui.context.compacted": "已加载的记录中含压缩摘要",
  "ui.context.manualOnly": "仅限显式调用",
  "ui.context.append": "追加系统提示",

  "ui.fileCards.heading": "相关文件",
  "ui.fileCards.open": "打开预览",
  "ui.fileCards.file": "文件",
  "ui.navigation.project": "项目",
  "ui.navigation.newSession": "新会话",
  "ui.navigation.noRecentSessions": "新会话会显示在这里。",
  "ui.navigation.workspace": "工作区",
  "ui.navigation.chooseProject": "选择项目",
  "ui.navigation.chooseWorkspace": "选择工作区",
  "ui.navigation.projectPicker": "选择项目",
  "ui.navigation.workspacePicker": "选择工作区",
  "ui.navigation.closePicker": "关闭选择器",
  "ui.usage.title": "上下文与用量",
  "ui.usage.open": "查看上下文与用量",
  "ui.usage.close": "关闭上下文与用量",
  "ui.usage.context": "上下文",
  "ui.usage.contextUsed": "已用 Token",
  "ui.usage.contextWindow": "上下文窗口",
  "ui.usage.contextPercent": "占用比例",
  "ui.usage.tokens": "会话用量",
  "ui.usage.input": "输入",
  "ui.usage.output": "输出",
  "ui.usage.cacheRead": "缓存读取",
  "ui.usage.cacheWrite": "缓存写入",
  "ui.usage.total": "总 Token",
  "ui.usage.cost": "总费用",
  "ui.usage.unknown": "未知",
  "ui.attachmentPreview.preview": "预览附件",
  "ui.attachmentPreview.close": "关闭",
  "ui.attachmentPreview.remove": "移除附件",
  "ui.attachmentPreview.fileName": "文件名",
  "ui.attachmentPreview.type": "文件类型",
  "ui.attachmentPreview.size": "大小",
  "ui.attachmentPreview.details": "文件详情",
  "ui.attachmentPreview.unavailable": "此类文件暂不支持内容预览。",
  "ui.attachmentPreview.invalidText": "无法按 UTF-8 文本解码此文件。",
  "ui.attachmentPreview.imageFailed": "无法显示此图片。",
  "ui.attachmentPreview.truncated": "仅显示此文件的前 64 KB。",
  "ChatView.process_steps": "处理过程",
  "ChatView.process_running": "正在处理",
  "ChatView.process_thinking": "正在思考",
  "ChatView.process_failed": "项失败",
  "ChatView.process_unfinished": "项未完成",
  "ChatView.process_tool": "次工具调用",
  "ChatView.process_tools": "次工具调用",
  "ChatView.process_thought": "段思考",
  "ChatView.process_thoughts": "段思考",
  "ChatView.process_record": "条记录",
  "ChatView.process_records": "条记录",
  "ChatView.process_compaction": "历史压缩",
  "ChatView.process_branch": "分支摘要",
  "ui.chatTimeline.transcript": "对话内容",
  "ui.chatTimeline.controls": "滚动控制",
  "ui.chatTimeline.navigation": "对话导航",
  "ui.chatTimeline.preview": "消息预览",
  "ui.chatTimeline.jump": "跳转到消息",
  "ui.chatTimeline.emptyReply": "暂无回复正文",
  "ui.chatTimeline.image": "图片消息",
  "ui.chatTimeline.top": "跳到顶部",
  "ui.chatTimeline.end": "跳到末尾",
  "ui.composer.message": "给 Pi 发消息",
  "ui.composer.attach": "添加附件",
  "ui.composer.model": "选择模型",
  "ui.composer.status": "会话状态",
  "ui.composer.stopWork": "停止当前任务",
  "ui.composer.machinePicker": "选择机器",
  "ui.composer.local": "本地",
  "ui.composer.send": "发送",
  "ui.composer.queue": "排队",
  "ui.composer.steer": "引导",
  "ui.composer.stop": "停止",
  "ui.composer.sending": "正在发送…",
  "ui.composer.compacting": "正在压缩历史 · 下一条消息将排队",
  "ui.composer.attachments": "附件",
  "ui.composer.placeholder": "给 Pi 发消息…",
  "ui.modelPicker.close": "关闭",
  "ui.modelPicker.search": "搜索模型",
  "ui.modelPicker.manage": "管理可用模型…",
  "ui.modelPicker.current": "当前模型",
  "ui.modelPicker.defaultHelp": "星标用于设置新会话默认模型。",
  "ui.modelPicker.saving": "正在切换模型…",
  "ui.modelPicker.savingDefault": "正在保存默认值…",
  "ui.modelPicker.saveFailed": "未能切换模型，请重试。",
  "ui.modelPicker.defaultFailed": "未能保存新会话默认值，请重试。",
  "ui.modelPicker.empty": "没有匹配的模型",
  "ui.thinking.max": "最高",
  "ui.thinkingPicker.trigger": "思考",
  "ui.thinkingPicker.title": "思考强度",
  "ui.thinkingPicker.close": "关闭",
  "ui.thinkingPicker.current": "当前",
  "ui.thinkingPicker.preview": "预览",
  "ui.thinkingPicker.faster": "更快",
  "ui.thinkingPicker.smarter": "更深入",
  "ui.thinkingPicker.lower": "较低",
  "ui.thinkingPicker.higher": "较高",
  "ui.thinkingPicker.hint": "拖动预览，松开即可应用。",
  "ui.thinkingPicker.saving": "正在保存…",
  "ui.thinkingPicker.saveFailed": "未能修改思考强度，请重试。",
  "ui.thinkingPicker.defaultAction": "设为新会话默认值",
  "ui.thinkingPicker.defaultStored": "新会话默认值",
  "ui.thinkingPicker.defaultLoading": "正在加载默认值…",
  "ui.thinkingPicker.defaultFailed": "未能保存新会话默认值，请重试。",
  "ui.thinkingPicker.none": "未设置",
  "ui.thinkingPicker.unavailable": "此模型不支持调整思考强度。",
  "ui.thinkingPicker.fixed": "此模型的思考强度固定。",
  "ui.thinkingPicker.unknown": "请选择此模型支持的思考强度。",
  "ui.thinkingDescription.off": "不使用额外推理。",
  "ui.thinkingDescription.minimal": "简短推理，适合简单任务。",
  "ui.thinkingDescription.low": "轻量推理，适合日常任务。",
  "ui.thinkingDescription.medium": "兼顾推理深度与响应时间。",
  "ui.thinkingDescription.high": "深入推理，适合复杂任务。",
  "ui.thinkingDescription.xhigh": "更充分地推理，适合困难任务。",
  "ui.thinkingDescription.max": "使用此模型支持的最高推理强度。",
  "clients.fork_from_the_session_tree_is_unavailable.02c41b7d": "无法从会话树创建分支。请重启会话守护进程以启用此功能。",
  "workspaceUploads.workspace_upload_cancelled.592407c1": "工作区上传已取消",
  "workspaceUploads.workspace_upload_failed.719d68c1": "工作区上传失败",
  "workspaceUploads.workspace_upload_aborted.b5505fc9": "工作区上传已中止",
  "ActionPalette.action_palette.13cea0f6": "搜索与命令",
  "AskUserCard.sending.3fd54f08": "正在发送…",
  "AskUserCard.send_answers.d76b03bb": "发送回答",
  "AskUserCard.sending.1dd6ffb6": "正在发送…",
  "AskUserCard.send_anyway.8f8e2ef0": "仍然发送",
  "AskUserCard.custom_answer.d4e9bc1d": "自定义回答",
  "AskUserCard.custom.c4073abe": "自定义",
  "AskUserCard.questions_skipped.da81d824": "已跳过问题",
  "AskUserCard.answers_sent.a011123d": "已发送回答",
  "AskUserCard.superseded.fc2c5392": "已替代",
  "AskUserCard.cancelled.500d5b4d": "已取消",
  "AskUserCard.answers.19b8b8b0": "回答",
  "AskUserCard.questions.833630f1": "问题",
  "AskUserCard.a_newer_question_set_replaced_this_one.cdb0ae04": "此组问题已被新问题替代。下方回答草稿未发送给模型。",
  "AuthDialog.use_a_subscription.3afb4acc": "使用订阅",
  "AuthDialog.chatgpt_plus_pro_claude_pro_max_or.1a9e4fb5": "ChatGPT Plus/Pro、Claude Pro/Max 或 GitHub Copilot",
  "AuthDialog.use_a_subscription.c9a2c5c8": "使用订阅",
  "AuthDialog.use_provider_credentials.7d6c38c9": "使用服务商凭据",
  "AuthDialog.configure_an_api_key_or_provider_specific.2e823718": "在当前兼容 Pi 的配置档案 auth.json 中配置 API 密钥或服务商专用凭据",
  "AuthDialog.use_provider_credentials.61e5d0c2": "使用服务商凭据",
  "AuthDialog.configure_provider_authentication.25d5721b": "配置服务商认证",
  "AuthDialog.select_provider_authentication.6457c0c5": "选择服务商认证",
  "AuthDialog.select_subscription_provider.629a2356": "选择订阅服务商",
  "AuthDialog.select_credential_provider.c53aef8c": "选择凭据服务商",
  "AuthDialog.remove_stored_provider_authentication.b889d3a1": "移除已保存的服务商认证",
  "AuthDialog.no_stored_credentials_environment_variables_and_models.6b471b8a": "没有已保存的凭据。环境变量和 models.json 设置保持不变。",
  "AuthDialog.no_providers_available.dc18b5b8": "没有可用的服务商。",
  "AuthDialog.subscription.2d840827": "订阅",
  "AuthDialog.credentials.59c26340": "凭据",
  "AuthDialog.configured.e8edecae": "✓ 已配置",
  "AuthDialog.runtime.f4f918cf": "✓ 运行时",
  "AuthDialog.custom_key.d8971bec": "✓ 自定义密钥",
  "AuthDialog.models_json_key.e5843869": "✓ models.json 密钥",
  "AuthDialog.models_json_command.d2095b18": "✓ models.json 命令",
  "ChatView.queued_until_session_starts.5b54250c": "等待会话启动",
  "ChatView.will_send_once_the_backend_session_is.e6be2b4e": "后端会话就绪后发送",
  "ChatView.queued_messages.904505cc": "排队消息",
  "ChatView.tool_output.81a5fb0b": "工具输出",
  "ChatView.live_events.324b38f3": "实时事件",
  "ChatView.events.a9f87569": "事件",
  "ChatView.no_pi_message_metadata_available.11cd8ccc": "没有可用的 Pi 消息元数据",
  "ChatView.jump_to_end.c37e7d58": "跳到末尾",
  "ChatView.following_live_jump_to_end.9520bc45": "实时跟随 — 跳到末尾",
  "ChatView.jump_to_end_and_follow_live.db38db8e": "跳到末尾并实时跟随",
  "ChatView.automatic_following_disabled.0de38a22": "已禁用自动跟随",
  "ChatView.following_live.b062bdb4": "正在实时跟随",
  "ChatView.live_following_paused.ecda395d": "实时跟随已暂停",
  "ChatView.expand_notifications.6f42f8f6": "展开通知",
  "ChatView.collapse_notifications.48fb5653": "折叠通知",
  "ChatView.individual_queue_controls_are_unavailable_with_this.71571b82": "此运行时不支持单条队列控制。",
  "ChatView.steer.ca8342d8": "引导",
  "ChatView.queue.b93d6e9f": "排队",
  "ChatView.copied.490135e8": "已复制",
  "ChatView.could_not_copy_message.00b88cb1": "无法复制消息",
  "ChatView.move_to_the_end_of_the_follow.1e709cf7": "移至后续消息队列末尾",
  "ChatView.move_to_the_end_of_the_steering.074a4cf7": "移至引导消息队列末尾",
  "ChatView.switch_to_queue.5cd3b8f2": "改为排队",
  "ChatView.switch_to_steer.4a0b2429": "改为引导",
  "ChatView.recall_this_message_s_text_and_clear.adbff4bc": "取回此消息文本并清除后续排队消息",
  "ChatView.remove_only_this_message.5e747f11": "仅移除此消息",
  "ChatView.empty_input.902c5033": "空输入",
  "CommandPicker.select.d3775a76": "选择",
  "CommandPicker.failed_to_set_default_option.de894d10": "设置默认选项失败",
  "ContentRendererHost.copy_source.0521b5bf": "复制源码",
  "ContentRendererHost.copy_source.89d602e9": "复制源码",
  "ContentRendererHost.preview_failed_raw_source_is_shown_below.0ed9badd": "预览失败。下方显示原始源码。",
  "ContentRendererHost.copied_source.02f3ab73": "已复制源码",
  "ContentRendererHost.failed_to_copy_source.5a0b0301": "复制源码失败",
  "ContentRendererHost.preview.1e9a6cbb": "预览",
  "ContentRendererHost.render.9d8e085c": "渲染",
  "ContentRendererHost.copied_source.d92c9bc8": "已复制源码",
  "ContentRendererHost.copy_source.6c1cb102": "复制源码",
  "ExtensionDialogCard.answered.9dcbf01a": "已回答",
  "ExtensionDialogCard.cancelled.4c11d896": "已取消",
  "ExtensionDialogCard.timed_out.db6c2ca3": "已超时",
  "ExtensionDialogCard.aborted.64e1cad1": "已中止",
  "ExtensionDialogCard.session_ended.d1650384": "会话已结束",
  "ExtensionDialogCard.closed_without_an_answer.ae5451b6": "已关闭，未回答。",
  "ExtensionDialogCard.yes.9f70286c": "是",
  "ExtensionDialogCard.no.18fe4d07": "否",
  "ExtensionDialogCard.answered_with_an_empty_response.c2f28c9a": "已回答，内容为空。",
  "ExtensionDialogCard.dismissed_without_an_answer.27f8c8e5": "已关闭，未回答。",
  "ExtensionDialogCard.no_answer_was_given_before_the_dialog.c7d92685": "对话框超时前未收到回答。",
  "ExtensionDialogCard.the_run_ended_before_this_dialog_was.d29f671c": "回答此对话框前运行已结束。",
  "ExtensionDialogCard.the_session_ended_before_this_dialog_was.b8aa184b": "回答此对话框前会话已结束。",
  "ExtensionDialogCard.auto_cancel_imminent.d92a9e17": "即将自动取消",
  "ExtensionDialogCard.sending.a3ebadaa": "正在发送…",
  "ExtensionDialogCard.send.8e1da356": "发送",
  "FormattedText.copied_code_block.1b9e03c5": "已复制代码块",
  "FormattedText.failed_to_copy_code_block.bf5a1ad5": "复制代码块失败",
  "FormattedText.copy_code_block.d31aaa3e": "复制代码块",
  "ImagePresentation.show_image.d44ff1f5": "显示图片",
  "ImagePresentation.image.47ceb860": "图片",
  "MachineDialog.add_machine.6948403c": "添加机器",
  "MachineDialog.enter_the_reachable_base_url_first_including.be6854e0": "请先输入可访问的基础 URL，包含 http:// 或 https://。",
  "MachineDialog.adding.c805a348": "正在添加…",
  "MachineDialog.add_machine.0d4dd2e1": "添加机器",
  "MachineDialog.remote_pi_web_url_is_required.1ae4b3e9": "请输入远程 PI WEB URL。",
  "MachineDialog.enter_a_valid_url_including_http_or.71421261": "请输入有效 URL，包含 http:// 或 https://。",
  "MachineDialog.use_an_http_or_https_url.6ec092db": "请使用 http:// 或 https:// URL。",
  "MachineDialog.do_not_include_credentials_in_the_machine.2b21059c": "机器 URL 中不能包含凭据。",
  "MachineDialog.do_not_include_a_query_string_or.3d5c06a3": "不能包含查询字符串或片段。",
  "MachineList.online.a6540e89": "在线",
  "MachineList.offline.00fbd704": "离线",
  "MachineList.error.994b145d": "错误",
  "MachineList.unknown.f2a3dc0c": "未知",
  "MachineList.local_pi_web.86c46afc": "本地 PI WEB",
  "MachineList.remote_pi_web.ece6e6d5": "远程 PI WEB",
  "MachineList.unread_sessions_on_this_machine.73f27cc7": "此机器有未读会话",
  "MachineList.machine_terminal_active.876060f2": "机器终端正在运行",
  "MachineList.machine_active.2a61b2b2": "机器正在运行",
  "MachineList.no_machine_selected.71d61954": "未选择机器",
  "MachineSwitcher.unread_sessions_on_this_machine.0787630c": "此机器有未读会话",
  "MachineSwitcher.machine_terminal_active.aedbe619": "机器终端正在运行",
  "MachineSwitcher.machine_active.c8c38e26": "机器正在运行",
  "MachineSwitcher.online.26e0d2c4": "在线",
  "MachineSwitcher.offline.8d4b5e98": "离线",
  "MachineSwitcher.error.16e7741c": "错误",
  "MachineSwitcher.unknown.274775f3": "未知",
  "MachineSwitcher.remote_pi_web.a4540631": "远程 PI WEB",
  "MarkdownImage.image_loading_disabled.fcd8b3ac": "已禁用图片加载",
  "MarkdownImage.show_image.d38863a7": "显示图片",
  "ModelPicker.select_model.aba5a42c": "选择模型",
  "ModelPicker.enabled.2f79f806": "已启用",
  "ModelPicker.all_models.38ebb146": "所有模型",
  "ModelPicker.all_models_in_catalog_order.7e24a30c": "按目录顺序显示所有模型",
  "ModelPicker.enabled_models.978d2308": "已启用模型",
  "ModelPicker.select_all.2e61fd82": "全选",
  "ModelPicker.deselect_all.7a0a40b3": "取消全选",
  "ModelPicker.workspace_settings_control_model_availability.b9e1bbe6": "模型可用性由工作区设置控制",
  "ModelPicker.the_current_model_is_unavailable.752f9de6": "当前模型不可用",
  "ModelPicker.updating_model_availability.bd9c2a77": "正在更新模型可用性",
  "ModelPicker.workspace_settings_control_model_availability.1ead34c7": "模型可用性由工作区设置控制",
  "ModelPicker.the_current_model_is_unavailable.5349ac19": "当前模型不可用",
  "ModelPicker.failed_to_set_default_model.3d3541ef": "设置默认模型失败",
  "ModelPicker.disable.5229f1ce": "禁用",
  "ModelPicker.enable.75c229fa": "启用",
  "ModelPicker.workspace_settings_control_model_availability.dcd92cd6": "模型可用性由工作区设置控制",
  "ModelPicker.the_current_model_must_remain_enabled.0364beee": "当前模型必须保持启用",
  "ModelPicker.current.3bba53fd": " ✓ 当前",
  "ModelPicker.enable_all_models.eefd67ea": "启用所有模型",
  "ModelPicker.keep_only_the_current_model.9b8c5580": "仅保留当前模型",
  "PiWebApp.remote_machine.5233c59d": "远程机器",
  "PiWebApp.preview_cleanup_before_running_it.6bfc1f43": "执行前请先预览清理结果。",
  "PiWebApp.loading_projects.c11b5753": "正在加载项目…",
  "PiWebApp.looking_for_projects_you_have_added_to.48f17012": "正在查找已添加到 PI WEB 的项目。",
  "PiWebApp.no_projects_yet.ae56d5c4": "尚未添加项目",
  "PiWebApp.use_actions_add_project_to_add_a.96056a51": "通过“搜索 → 添加项目”添加文件夹。选择工作区后，即可使用文件、终端等工具。",
  "PiWebApp.select_a_project.41a584e8": "选择项目",
  "PiWebApp.choose_a_project_from_the_sidebar_then.02253883": "从侧栏选择项目，然后选择工作区以使用工具。",
  "PiWebApp.loading_workspaces.1497018c": "正在加载工作区…",
  "PiWebApp.no_workspaces_found.c31be351": "未找到工作区",
  "PiWebApp.select_a_workspace.0b547f8c": "选择工作区",
  "PiWebApp.loading_projects.77104082": "正在加载项目…",
  "PiWebApp.select_or_start_a_session.0c07f1a7": "选择或启动会话。",
  "PiWebApp.select_a_workspace_to_start_a_session.e03c1a36": "选择工作区以启动会话。",
  "PiWebApp.add_a_project_to_start_a_session.18238be1": "添加项目以启动会话。",
  "PiWebApp.select_a_project_and_workspace_to_start.ef065409": "选择项目和工作区以启动会话。",
  "PiWebApp.refresh_current_panel.6745b25e": "刷新当前面板",
  "PiWebApp.workspace.361434e4": "工作区",
  "PiWebApp.clean_up_sessions.cf0c57ac": "清理会话",
  "PiWebApp.preview_and_manually_clean_up_idle_or.922f72a3": "预览并手动清理所选机器上的空闲或归档会话",
  "PiWebApp.sessions.602c1493": "会话",
  "PiWebApp.reset_navigation_panel_size.6e70445a": "重置导航面板大小",
  "PiWebApp.restore_the_navigation_panel_to_its_default.727c9e23": "将导航面板恢复为默认宽度",
  "PiWebApp.view.9613ea94": "视图",
  "PiWebApp.reset_workspace_panel_size.bc2e69fc": "重置工作区面板大小",
  "PiWebApp.restore_the_workspace_panel_to_its_default.6fa7c11a": "将工作区面板恢复为默认宽度",
  "PiWebApp.view.aeaf7cca": "视图",
  "PiWebApp.reset_panel_sizes.047e79f4": "重置面板大小",
  "PiWebApp.restore_all_side_panels_to_their_default.66de84d2": "将所有侧面板恢复为默认宽度",
  "PiWebApp.view.44ce88a7": "视图",
  "PiWebApp.open_navigation.d486774c": "打开导航",
  "PiWebApp.find_destinations_and_manage_pinned_tabs.70f3990a": "查找页面和工具，并管理固定入口",
  "PiWebApp.navigation.35ce8ca9": "导航",
  "PiWebApp.focus_machines.2e0e4bd4": "聚焦机器",
  "PiWebApp.move_keyboard_focus_to_the_machine_selector.4b768e01": "将键盘焦点移至机器选择器",
  "PiWebApp.navigation.8f4618fe": "导航",
  "PiWebApp.focus_projects.98925316": "聚焦项目",
  "PiWebApp.move_keyboard_focus_to_the_projects_list.faf0abd3": "将键盘焦点移至项目列表",
  "PiWebApp.navigation.56cb6123": "导航",
  "PiWebApp.focus_workspaces.c81c9507": "聚焦工作区",
  "PiWebApp.move_keyboard_focus_to_the_workspaces_list.3bd1f8d4": "将键盘焦点移至工作区列表",
  "PiWebApp.navigation.5e8dffc0": "导航",
  "PiWebApp.focus_sessions.f626f7c3": "聚焦会话",
  "PiWebApp.move_keyboard_focus_to_the_sessions_list.ee136f70": "将键盘焦点移至会话列表",
  "PiWebApp.navigation.a1222f00": "导航",
  "PiWebApp.pi_web_plugins.44f989e1": "PI WEB 插件",
  "PiWebApp.required_terminal_plugin_is_unavailable_after_plugin.5f924c82": "插件激活后必需的终端插件不可用。请打开设置查看恢复指引。",
  "PiWebApp.workspace_removal_is_not_available.4f4afcb0": "无法移除工作区",
  "PiWebApp.workspace_deletion_scope_changed.f0a2a1c0": "工作区删除范围已更改",
  "PiWebApp.select_model.d9ea3ae1": "选择模型",
  "PiWebApp.current.15361875": " ✓ 当前",
  "PiWebApp.select_thinking_level.4e50eb8c": "选择思考强度",
  "PiWebApp.current.470b0064": " ✓ 当前",
  "PiWebApp.recalling_will_replace_your_unsent_draft_continue.99db6ada": "取回消息将替换未发送的草稿。是否继续？",
  "PiWebApp.this_message_s_conversation_is_no_longer.650328cc": "此消息所属的对话已不可用。",
  "PiWebApp.another_draft_replacing_action_is_already_in.186dfd7b": "另一个替换草稿的操作正在进行中。",
  "PiWebApp.going_back_will_replace_your_unsent_draft.fe4f9e9d": "回退将替换未发送的草稿。是否继续？",
  "PiWebApp.button_aria_label_navigation.7fae6367": "button[aria-label=\"导航\"]",
  "PiWebApp.sessions.326a773f": "会话",
  "PiWebApp.chat.66fa795b": "对话",
  "PiWebApp.no_reasoning.34ab682d": "不进行推理",
  "PiWebApp.very_brief_reasoning_k_tokens.4a351058": "极简推理（约 1k Token）",
  "PiWebApp.light_reasoning_k_tokens.cfef40d8": "轻度推理（约 2k Token）",
  "PiWebApp.moderate_reasoning_k_tokens.c46b6830": "中度推理（约 8k Token）",
  "PiWebApp.deep_reasoning_k_tokens.04b7b4dc": "深度推理（约 16k Token）",
  "PiWebApp.maximum_reasoning_k_tokens.721e91f4": "最高推理（约 32k Token）",
  "ProjectDialog.add_project.d38cd98d": "添加项目",
  "ProjectList.no_project_selected.edb7a30b": "未选择项目",
  "ProjectList.unread_sessions_in_this_project.3eaa893c": "此项目有未读会话",
  "ProjectList.project_terminal_active.ccf696aa": "项目终端正在运行",
  "ProjectList.project_active.af61b42e": "项目正在运行",
  "PromptEditor.message_pi_use_for_commands_for_tracked.a1b5c004": "给 Pi 发消息… / 选择命令，@ 选择已跟踪文件，@ 加空格选择所有文件，# 选择模型",
  "PromptEditor.excluded_from_context.77ba9e69": " · 不计入上下文",
  "PromptEditor.queue_until_the_current_activity_finishes.2420ce17": "排队等待当前活动结束",
  "PromptEditor.send_message.0a862bc3": "发送消息",
  "PromptEditor.queue_message.85941fe3": "将消息加入队列",
  "PromptEditor.send_message.0f5782d0": "发送消息",
  "PromptEditor.stop_current_work_and_clear_queued_messages.6018d1cd": "停止当前工作并清空排队消息",
  "PromptEditor.nothing_running.c930593d": "当前没有运行中的任务",
  "PromptEditor.no_model.0a560ca1": "未选择模型",
  "PromptEditor.how_attachments_are_delivered_to_the_agent.41e0a0ea": "附件发送给代理的方式",
  "PromptEditor.general_files_are_saved_and_mentioned_from.559b9fea": "普通文件保存在工作区并通过引用发送",
  "PromptEditor.images_only.76d1724e": "（仅图片）",
  "PromptEditor.message_not_submitted_context_kept_for_retry.9e178614": "消息未提交。已保留上下文以便重试。",
  "PromptEditor.failed_to_read_file.76c972dd": "读取文件失败",
  "PromptEditor.unexpected_file_reader_result.4f05cda8": "文件读取结果异常",
  "SessionCleanupDialog.run_cleanup.5fce8304": "执行清理",
  "SessionCleanupDialog.select_at_least_one_project_to_run.bfa342bc": "请至少选择一个项目以执行清理",
  "SessionCleanupDialog.preview_cleanup_before_running_it.5bc5269e": "执行前请先预览清理结果",
  "SessionCleanupDialog.clean_up_sessions.4c9fa7b7": "清理会话",
  "SessionCleanupDialog.cancel.d355c95d": "取消",
  "SessionCleanupDialog.close.98874c72": "关闭",
  "SessionCleanupDialog.previewing.2c40ad17": "正在预览…",
  "SessionCleanupDialog.preview.396ef5ec": "预览",
  "SessionCleanupDialog.running.603d0ae6": "正在运行…",
  "SessionCleanupDialog.run_cleanup.e281c161": "执行清理",
  "SessionCleanupDialog.select_at_least_one_project_to_run.59afcf1f": "请至少选择一个项目以执行清理。",
  "SessionCleanupDialog.preview_cleanup_before_running_it.273df4a8": "执行前请先预览清理结果。",
  "SessionList.parent_unavailable.4aca2659": "父会话不可用",
  "SessionList.parent_session_is_not_available_in_this.fb680f8e": "此工作区中没有可用的父会话",
  "SessionList.no_session_selected.56adf5f8": "未选择会话",
  "SessionList.close_current_session_selection.e5af6532": "关闭当前会话选择",
  "SessionList.select_current_sessions.00238328": "选择当前会话",
  "SessionList.close_current_session_selection.d2c1e867": "关闭当前会话选择",
  "SessionList.select_current_sessions.e089f747": "选择当前会话",
  "SessionList.start_another_session.9a41bfa8": "再启动一个会话",
  "SessionList.start_a_new_session.7f8ab8f8": "启动新会话",
  "SessionList.starting_session.5520b76e": "正在启动会话…",
  "SessionList.close_archived_session_selection.c2e5c130": "关闭归档会话选择",
  "SessionList.select_archived_sessions.ff1c1292": "选择归档会话",
  "SessionList.close_archived_session_selection.1b60508e": "关闭归档会话选择",
  "SessionList.select_archived_sessions.2ad268b2": "选择归档会话",
  "SessionList.sending_subsession_message.da44466e": "正在发送子会话消息",
  "SessionList.agent_subsessions_active.9f238611": "代理子会话正在运行",
  "SessionList.unread_subsession_activity.f2c995fe": "子会话有未读动态",
  "SessionList.stop_current_session_activity_before_reloading_from.26e02613": "从磁盘重新加载前请先停止当前会话活动",
  "SessionList.reload_session_from_disk_without_refreshing_pi.45562ec6": "从磁盘重新加载会话，保留 Pi 运行时资源",
  "SessionList.descendant_session.8d6a8d2d": "子会话",
  "SessionList.descendant_sessions.bdb4e1f5": "子会话",
  "SessionList.archived_session.33b1365f": "归档会话",
  "SessionList.archived_sessions.0e5e8f61": "归档会话",
  "SessionList.creating.928a629f": "正在创建 · ",
  "SessionList.error.2a6d4bfd": "错误 · ",
  "SessionList.new.978ae907": "新建 · ",
  "SessionList.read_only.1ac897b3": "只读 · ",
  "SessionList.sending_message.bfa55fb9": "正在发送消息",
  "SessionList.session_active.2d07f465": "会话正在运行",
  "SessionList.unread_session_activity.73c05494": "会话有未读动态",
  "SessionTreeNavigator.user.b4295872": "你",
  "SessionTreeNavigator.assistant.ce040ec2": "Pi",
  "SessionTreeNavigator.tool_result.05478b0a": "工具结果",
  "SessionTreeNavigator.custom_message.3638712f": "自定义消息",
  "SessionTreeNavigator.compaction.ac3f049c": "上下文压缩",
  "SessionTreeNavigator.branch_summary.3923f862": "分支摘要",
  "SessionTreeNavigator.model.1efff5d3": "模型",
  "SessionTreeNavigator.thinking.4e301ff4": "思考",
  "SessionTreeNavigator.session_info.810dbd19": "会话信息",
  "SessionTreeNavigator.label.0a626279": "标签",
  "SessionTreeNavigator.custom.5f2ab5ef": "自定义",
  "SessionTreeNavigator.other.91272c89": "其他",
  "SessionTreeNavigator.navigate_session_tree.79f68bfb": "浏览会话树",
  "SessionTreeNavigator.no_child_entries.08568a90": "没有子记录",
  "SessionTreeNavigator.collapse_branch.76e8091c": "折叠分支",
  "SessionTreeNavigator.expand_branch.4616895d": "展开分支",
  "SessionTreeNavigator.continue_in_this_session.bb41a20c": "在此会话中继续",
  "SessionTreeNavigator.branch_from_the_selected_entry_in_this.e9a373d7": "在此会话文件的所选记录处分支，并保留其他分支。",
  "SessionTreeNavigator.fork_into_a_new_session.a80d33ee": "派生为新会话",
  "SessionTreeNavigator.create_and_switch_to_a_separate_session.c750d420": "创建并切换到独立的会话文件，保留原会话。",
  "SessionTreeNavigator.no_summary.e771284c": "不生成摘要",
  "SessionTreeNavigator.switch_branches_without_adding_a_summary_entry.463308b6": "切换分支，不添加摘要记录。",
  "SessionTreeNavigator.summarize.5bb336ff": "总结",
  "SessionTreeNavigator.ask_pi_to_summarize_the_context_being.05b0f37c": "让 Pi 总结即将离开的上下文。",
  "SessionTreeNavigator.summarize_with_custom_focus.71393cde": "按自定义重点总结",
  "SessionTreeNavigator.guide_pi_toward_the_details_that_matter.c74a8b36": "引导 Pi 关注新分支所需的细节。",
  "SessionTreeNavigator.the_new_session_will_branch_before_this.f650a4ee": "新会话将在此用户消息之前分支，此消息文本将作为新会话草稿回到输入框。",
  "SessionTreeNavigator.the_new_session_will_include_this_entry.18d56592": "新会话将包含此记录及其之前的全部历史。",
  "SessionTreeNavigator.this_message_s_text_will_return_to.77062f00": "此消息文本将回到输入框，可在此会话中编辑后重新发送。",
  "SessionTreeNavigator.the_prompt_editor_will_be_empty_after.a8e349e4": "从此记录继续后，输入框将被清空。",
  "SessionTreeNavigator.cancelling.6929b869": "正在取消…",
  "SessionTreeNavigator.cancel_summarization.5e5ba9eb": "取消总结",
  "SessionTreeNavigator.continue_from_here.6ba5c7bd": "从此处继续",
  "SessionTreeNavigator.fork_into_new_session.e93710ce": "派生为新会话",
  "SessionTreeNavigator.forking.4e53a7ea": "正在派生…",
  "SessionTreeNavigator.continuing.a480eb07": "正在继续…",
  "SessionTreeNavigator.summarizing.760c40e2": "正在总结…",
  "SessionTreeNavigator.session_tree_navigation_is_unavailable_close_and.10c54635": "会话树导航不可用。请关闭并重新打开 /tree 后重试。",
  "SessionTreeNavigator.summarization_cancelled_your_selected_history_entry_is.e5b12dd6": "已取消总结。所选历史记录保持不变。",
  "SessionTreeNavigator.navigation_cancelled_your_selected_history_entry_is.c825c03b": "已取消导航。所选历史记录保持不变。",
  "SessionTreeNavigator.fork_from_the_session_tree_is_unavailable.26b60a8c": "无法从会话树派生。请关闭并重新打开 /tree 后重试。",
  "SessionTreeNavigator.fork_cancelled_no_new_session_was_created.d30726cc": "已取消派生。未创建新会话，所选历史记录保持不变。",
  "SessionTreeNavigator.summarization_cannot_be_cancelled_from_this_client.acbb4cb0": "无法从此客户端取消总结。",
  "SessionTreeNavigator.cancelling_summarization.1e81839d": "正在取消总结…",
  "SettingsDialog.pi_web_settings.5d890f4d": "PI WEB 设置",
  "SettingsDialog.general.9d6707b6": "常规",
  "SettingsDialog.gateway_selected_machine.97827f75": "网关 + 所选机器",
  "SettingsDialog.session_daemon.a8a7922c": "会话守护进程",
  "SettingsDialog.selected_machine.60ce1c88": "所选机器",
  "SettingsDialog.pi_packages.91f80e11": "Pi 包",
  "SettingsDialog.selected_machine.600984f6": "所选机器",
  "SettingsDialog.pi_web_plugins.e0e9e6b6": "PI WEB 插件",
  "SettingsDialog.selected_machine.17c9b7b9": "所选机器",
  "SettingsDialog.keyboard.39b81103": "键盘",
  "SettingsDialog.gateway_shortcuts.e71cb404": "网关快捷键",
  "SettingsDialog.plugin_lifecycle_diagnostics_are_unsupported.d1c878a2": "不支持插件生命周期诊断",
  "SettingsDialog.template.d8c062e2": "；",
  "SettingsDialog.install_pi_package.b31b8385": "安装 Pi 包",
  "SettingsDialog.remove_pi_package.fb3324ad": "移除 Pi 包",
  "SettingsDialog.update_pi_packages.8b88516e": "更新 Pi 包",
  "SettingsDialog.a_settings_operation_is_already_running.dbe5efc0": "已有设置操作正在运行。",
  "SettingsDialog.config_saved.e57a93f0": "配置已保存。",
  "SettingsDialog.config_saved.524176ed": "配置已保存。",
  "StatusBar.context_unknown.34527476": "上下文未知",
  "ToolExecutionView.preview_diff.5d45110d": "差异预览",
  "ToolExecutionView.applied_diff.fb9a87b0": "已应用的差异",
  "ToolExecutionView.file.b83d1127": "文件",
  "ToolExecutionView.full_diff.9d79d291": "完整差异",
  "ToolExecutionView.copied.22728566": "已复制",
  "ToolExecutionView.copy_diff.29fecc82": "复制差异",
  "ToolExecutionView.file.2e137c95": "文件",
  "ToolExecutionView.command.22162053": "命令",
  "ToolExecutionView.input.492ae516": "输入",
  "ToolExecutionView.edit.00b5f0df": "1 处编辑",
  "ToolExecutionView.done.89ba87a2": "已完成",
  "ToolExecutionView.failed.7451a21d": "失败",
  "ToolExecutionView.running.a2835d3a": "运行中",
  "ToolExecutionView.pending.75d0ead0": "等待中",
  "TranscriptImage.attached_image.0afeb548": "附加图片",
  "TranscriptImage.attached_image.e5767737": "附加图片",
  "TranscriptImage.image_loading_disabled.f82dfc52": "已禁用图片加载",
  "TranscriptImage.image_unavailable.d10d2aed": "图片不可用",
  "WorkspaceList.no_workspace_selected.a700f4d9": "未选择工作区",
  "WorkspaceList.main.5cd3eab9": " · 主工作区",
  "WorkspaceList.unread_sessions_in_this_workspace.bd44b166": "此工作区有未读会话",
  "WorkspaceList.workspace_terminal_active.93fbb211": "工作区终端正在运行",
  "WorkspaceList.workspace_active.2710797b": "工作区正在运行",
  "WorkspaceList.remove_workspace.17d6940c": "移除工作区",
  "WorkspaceList.workspace_removal_in_progress.b74ad6b2": "正在移除工作区",
  "WorkspaceList.removing.7dd36f48": "正在移除…",
  "WorkspaceList.copy_workspace_label.163c795e": "复制工作区名称",
  "WorkspaceList.copy_path.9a38e7ae": "复制路径",
  "WorkspaceList.copied.9209bdc9": "已复制",
  "WorkspaceList.main.4174485e": " · 主工作区",
  "WorkspacePanel.select_a_workspace.d637af8c": "选择工作区",
  "WorkspacePanel.choose_a_workspace_to_use_its_tools.1c580998": "选择工作区以使用工具。",
  "WorkspacePanel.no_workspace_tools_available.153e2257": "无工作区 tools available",
  "activityBadge.active.40fca3da": "运行中",
  "activityBadge.active.196b7290": "运行中",
  "AppContextBar.no_machine.f7f92e3f": "无机器",
  "AppContextBar.remote.6e06c0a1": " · 远程",
  "AppContextBar.no_machine_selected.9fa17d18": "未选择机器",
  "AppContextBar.no_project.9a842642": "无项目",
  "AppContextBar.no_project_selected.30bf775c": "未选择项目",
  "AppContextBar.no_workspace.3afbf59b": "无工作区",
  "AppContextBar.main.0ef52ece": " · 主工作区",
  "AppContextBar.no_workspace_selected.a554d91b": "未选择工作区",
  "AppContextBar.main.9962e11f": " · 主工作区",
  "AppContextBar.no_session.77f43535": "无会话",
  "AppContextBar.no_session_selected.77ebce4c": "未选择会话",
  "AppPanelEdgeControl.resize_panel.591a2c55": "调整面板大小",
  "AppPanelEdgeControl.expand_panel.ed3b46db": "展开面板",
  "AppPanelEdgeControl.collapse_panel.1b6c19aa": "折叠面板",
  "AppRefreshControl.full_page_reload.9009dfc6": "重新加载整个页面",
  "NavigationDialog.navigation.81259b67": "导航",
  "NavigationDialog.no_destinations_found.d366459a": "没有匹配的页面或工具",
  "errorBanner.error.710302f2": "错误",
  "errorBanner.warning.1f79dfb1": "警告",
  "errorBanner.info.36338f90": "信息",
  "SettingsGeneralPanel.selected_machine.f48d51c1": "所选机器",
  "SettingsGeneralPanel.unknown.d62169b4": "未知",
  "SettingsGeneralPanel.existing_file.63fefc92": "文件已存在",
  "SettingsGeneralPanel.this_file_will_be_created_on_save.812f722e": "保存时将创建此文件",
  "SettingsGeneralPanel.saving.3d58be6e": "正在保存…",
  "SettingsGeneralPanel.save_gateway_server_config.93519a05": "保存网关服务器配置",
  "SettingsGeneralPanel.loading_selected_machine_file_access_config.a3025dc6": "正在加载所选机器的文件访问配置…",
  "SettingsGeneralPanel.selected_machine_file_access_config_is_unavailable.f750567e": "所选机器的文件访问配置不可用。保存文件/上传设置前请先重新加载。",
  "SettingsGeneralPanel.existing_file.35d20e24": "文件已存在",
  "SettingsGeneralPanel.this_file_will_be_created_on_save.c784f502": "保存时将创建此文件",
  "SettingsGeneralPanel.saving.1400bac6": "正在保存…",
  "SettingsGeneralPanel.save_file_upload_config.b04e4894": "保存文件/上传配置",
  "SettingsGeneralPanel.configuration.ad4668a0": "配置",
  "SettingsGeneralPanel.any_host.5d5e668d": "任意主机",
  "SettingsPackagesPanel.installing.c23468fe": "正在安装…",
  "SettingsPackagesPanel.install.721a3484": "安装",
  "SettingsPackagesPanel.installing.af47a3a9": "正在安装…",
  "SettingsPackagesPanel.install.048406ac": "安装",
  "SettingsPackagesPanel.update_all_user_scope_pi_packages.a7665c2c": "更新所有用户范围的 Pi 包",
  "SettingsPackagesPanel.updating.fac83246": "正在更新…",
  "SettingsPackagesPanel.update_all.9fc9f09c": "全部更新",
  "SettingsPackagesPanel.update_this_pi_package.34b8ae89": "更新此 Pi 包",
  "SettingsPackagesPanel.updating.e56e835f": "正在更新…",
  "SettingsPackagesPanel.update.871c1e71": "更新",
  "SettingsPackagesPanel.removing.548bbe92": "正在移除…",
  "SettingsPackagesPanel.remove.0d3698eb": "移除",
  "SettingsPanelFrame.settings_panel.761760dd": "设置面板",
  "SettingsPluginsPanel.local_local_gateway.6922d7cd": "local（本地网关）",
  "SettingsPluginsPanel.configuration_is_unavailable_reload_to_try_again.ed4a963a": "配置不可用。更改插件启用状态前，请先重新加载后重试。",
  "SettingsPluginsPanel.active_server_plugin_state_unavailable.89728d5b": "无法获取服务端插件的当前状态",
  "SettingsPluginsPanel.restart_or_reconnect_sessiond_then_reload.300841ed": "请重启或重新连接 sessiond，然后重新加载。",
  "SettingsPluginsPanel.plugin_lifecycle_version_mismatch.75c29359": "插件生命周期版本不匹配",
  "SettingsPluginsPanel.the_web_process_and_session_daemon_do.b30c3b0e": "Web 进程与会话守护进程支持的插件生命周期协议不同。",
  "SettingsPluginsPanel.server_plugin_safe_mode_active.c12306c4": "服务端插件安全模式已启用",
  "SettingsPluginsPanel.safe_mode_restart_pending.d4446364": "安全模式等待重启生效",
  "SettingsPluginsPanel.safe_start_is_cleared_in_offline_config.2cf124fe": "离线配置已清除安全启动，但在 sessiond 重启前仍然生效。",
  "SettingsPluginsPanel.session_daemon_restart_required.42f5a58e": "需要重启会话守护进程",
  "SettingsPluginsPanel.desired_plugin_config_or_package_revisions_differ.5f7bf868": "预期插件配置或包版本与 sessiond 当前启动快照不同。重启 sessiond 可能中断正在运行的会话。",
  "SettingsPluginsPanel.plugin_id_conflict.44a30f61": "插件 ID 冲突",
  "SettingsPluginsPanel.plugin_discovery_diagnostic.c383e76d": "插件发现诊断",
  "SettingsPluginsPanel.active_snapshot.c6863fb2": "当前快照",
  "SettingsPluginsPanel.desired_catalog.7043f553": "预期目录",
  "SettingsPluginsPanel.loading_pi_web_plugins.4494aff0": "正在加载 PI WEB 插件…",
  "SettingsPluginsPanel.required_ordinary_config_cannot_disable.b755b692": "必需 · 无法通过普通配置禁用",
  "SettingsPluginsPanel.desired_package_config_absent.452bd625": "预期包/配置不存在",
  "SettingsPluginsPanel.config_disabled.6c15bc5a": "配置已禁用",
  "SettingsPluginsPanel.config_enabled.2e14a829": "配置已启用",
  "SettingsPluginsPanel.default_enabled.fb4224b7": "默认启用",
  "SettingsPluginsPanel.configured_only_package_not_discovered.b48e308b": "仅有配置 · 未发现包",
  "SettingsPluginsPanel.machine_specific.8fbefaec": " · 特定机器",
  "SettingsPluginsPanel.required.fbe1d01e": " · 必需",
  "SettingsPluginsPanel.active_snapshot_only.3055b694": " · 仅存在于当前快照",
  "SettingsPluginsPanel.required.38c8fe5f": "必需",
  "SettingsPluginsPanel.enabled.9e15adff": "已启用",
  "SettingsPluginsPanel.configured_only.72723347": "仅有配置",
  "SettingsPluginsPanel.browser_only.c8637591": "仅浏览器",
  "SettingsPluginsPanel.active.0addf7ef": "运行中",
  "SettingsPluginsPanel.failed.02b0086d": "失败",
  "SettingsPluginsPanel.incompatible.6187ea5e": "不兼容",
  "SettingsPluginsPanel.disabled.1dd4d6c5": "已禁用",
  "SettingsPluginsPanel.not_active.8ed3679c": "未运行",
  "SettingsPluginsPanel.active_state_unavailable.1630991a": "当前状态不可用",
  "SettingsSessiondPanel.local_local_gateway.27222439": "local（本地网关）",
  "SettingsSessiondPanel.enabled.68bcbbec": "已启用",
  "SettingsSessiondPanel.enabled.8c68f207": "已启用",
  "SettingsSessiondPanel.enabled.61d53259": "已启用",
  "SettingsSessiondPanel.loading_configuration.8f0bd4b6": "正在加载配置…",
  "SettingsSessiondPanel.configuration_is_unavailable_reload_to_try_again.f9b662a8": "配置不可用。请重新加载后重试。",
  "SettingsShortcutsPanel.press_a_letter_number_punctuation_function_or.e40953a3": "请按字母、数字、标点、功能键或导航键。按 Esc 取消录制。",
  "SettingsShortcutsPanel.unknown.86cdea82": "未知",
  "SettingsShortcutsPanel.no_default_shortcut.bc668391": "无默认快捷键",
  "SettingsShortcutsPanel.disabled.c07f9edd": "已禁用",
  "SettingsShortcutsPanel.unassigned.bfffde77": "未分配",
  "SettingsShortcutsPanel.unsaved.0edb4129": " · 未保存",
  "SettingsShortcutsPanel.cancel_recording.3f58f867": "取消录制",
  "SettingsShortcutsPanel.record.0391b747": "录制",
  "SettingsShortcutsPanel.recording_press_ctrl_or_alt_with_a.e894d7d3": "正在录制：请按 Ctrl/⌘ 或 Alt 加其他按键。按 Esc 取消。",
  "SettingsShortcutsPanel.composer_send_shortcuts_must_be_a_single.d10b8e4c": "消息输入框的发送快捷键必须为一组按键，不能使用按键序列。",
  "SettingsShortcutsPanel.another_action.fc68979c": "其他操作",
  "SettingsShortcutsPanel.other.46cc7693": "其他",
  "SettingsShortcutsPanel.other.5dc8a71f": "其他",
  "SettingsShortcutsPanel.other.5e3fbdb1": "其他",
  "SettingsShortcutsPanel.default.369362c4": "默认",
  "SettingsShortcutsPanel.custom.cf1f602b": "自定义",
  "SettingsShortcutsPanel.disabled.6b02229a": "已禁用",
  "SettingsShortcutsPanel.no_default.54b2a71e": "无默认值",
  "SettingsThemePanel.using_a_theme_saved_on_this_device.408c8ab7": "正在使用此设备保存的主题",
  "SettingsThemePanel.using_the_default_theme.7f64b2d6": "正在使用默认主题",
  "SettingsThemePanel.auto.4a08014a": " · 自动",
  "piPackageSettings.enter_a_pi_package_source_accepted_by.7921e529": "请输入 Pi 支持的包来源，例如 npm:@scope/package、Git/URL 来源或本地路径。",
  "piPackageSettings.project_scope.0b04d71d": "项目范围",
  "piPackageSettings.user_scope.39f202c7": "用户范围",
  "piPackageSettings.filtered_by_current_pi_package_settings.cc44d113": "已被当前 Pi 包设置过滤",
  "piPackageSettings.available_in_this_pi_web_process.aec19b63": "在当前 PI WEB 进程中可用",
  "piPackageSettings.installed_path_not_reported_by_pi.bbb5d79e": "Pi 未报告安装路径",
  "piPackageSettings.project_scope_pi_packages_are_listed_for.a8f4cd0b": "此处会列出项目范围的 Pi 包供查看，但 PI WEB 仅支持在此安全地更新用户范围的 Pi 包。",
  "piPackageSettings.no_pi_packages_are_configured_yet.e44094f9": "尚未配置 Pi 包。",
  "piPackageSettings.update_all_is_disabled_while_project_scope.81518df9": "列表包含项目范围的 Pi 包时，无法全部更新；请逐个更新用户范围的包。",
  "piPackageSettings.installed.3265c9f4": "已安装",
  "piPackageSettings.removed.ebcc8834": "已移除",
  "piPackageSettings.updated.146bfd6a": "已更新",
  "piPackageSettings.each_idle_pi_web_session.9ebbecf5": "每个空闲的 PI WEB 会话",
  "piPackageSettings.pi_web_browser_plugin_changes.0418f7b7": "PI WEB 浏览器插件的更改",
  "settingsConfigDraft.port_must_be_an_integer_from_to.83c34a7a": "端口必须是 1 到 65535 之间的整数。",
  "settingsConfigDraft.upload_default_folder.a55ac9e4": "默认上传文件夹",
  "settingsConfigDraft.attachment_default_folder.8e99c7a1": "默认附件文件夹",
  "settingsDataLoading.template.536c9909": "；",
  "composerShortcuts.touch_or_narrow_screen.4da0fbb4": "触屏或窄屏",
  "composerShortcuts.desktop.04f75979": "桌面",
  "composerShortcuts.one_key_combination_active_only_in_the.54fddb65": "仅在消息编辑器内生效的单组快捷键，优先于全局快捷键。",
  "composerShortcuts.chat_composer.728ac7e3": "消息输入框",
  "machineController.the_local_machine_cannot_be_removed.428d15ed": "无法移除本地机器。",
  "piWebStatusController.pi_web_update_check_was_skipped_because.1a0a4fc1": "离线或版本检查设置已禁用远程检查，因此跳过了 PI WEB 更新检查",
  "sessionController.the_backend_session_is_not_ready_for.43638954": "后端会话尚未就绪，无法发送排队消息。放弃本次失败的启动前，请先复制消息。",
  "sessionController.session_history_is_unavailable.cdc07df3": "会话历史不可用。",
  "sessionController.this_message_is_no_longer_available_in.c67cfaba": "此消息已不在会话历史中。",
  "sessionController.the_session_tree_navigator_is_no_longer.b6a6ea71": "会话树导航已不可用",
  "sessionController.the_session_tree_navigator_is_no_longer.3380b396": "会话树导航已不可用",
  "sessionController.the_session_list_could_not_be_refreshed.c4d22cb1": "无法刷新会话列表。请检查连接后重试。",
  "sessionController.the_conversation_could_not_be_refreshed_check.8a181d24": "无法刷新对话。请检查连接后重试。",
  "sessionController.session_started_but_its_navigation_changed_before.c9794a29": "会话已启动，但导航在选择完成前发生了变化。请从会话列表中选择它。",
  "sessionController.session_started_but_its_selection_changed_before.c4dc0a53": "会话已启动，但选择在导航完成前发生了变化。请从会话列表中选择它。",
  "sessionController.creating_session.a02c5a14": "正在创建会话",
  "sessionController.waiting_for_the_backend_session_to_be.5f25a8bc": "正在等待后端会话就绪",
  "sessionController.session_creation_failed.0a01a527": "会话创建失败",
  "workspaceController.project_not_found.aebda77a": "找不到项目",
  "workspaceController.workspace_authority_is_degraded.0b245fcd": "工作区管理服务处于降级状态",
  "markdown.template.0489bc0d": "<button type=\"button\" class=\"code-copy-button code-block-copy\" title=\"复制代码块\" aria-label=\"复制代码块\"><span aria-hidden=\"true\">⧉</span></button>",
  "keyboardShortcuts.enter_a_shortcut_choose_none_or_reset.5fd01f31": "输入快捷键、选择“无”，或恢复默认值。",
  "keyboardShortcuts.shortcut_chords_must_include_a_key.96ba3ebf": "快捷键组合必须包含按键。",
  "keyboardShortcuts.each_shortcut_chord_can_include_only_one.2647de8c": "每组快捷键只能包含一个非修饰键。",
  "keyboardShortcuts.shortcut_chords_must_include_a_key.b9b58318": "快捷键组合必须包含按键。",
  "actions.show_actions.16f031e0": "打开搜索",
  "actions.open_the_command_palette.ed5bc715": "搜索页面、命令和设置",
  "actions.general.aab6fc30": "常规",
  "actions.focus_prompt.95dd8a2a": "聚焦输入框",
  "actions.move_keyboard_focus_to_the_message_composer.8061da86": "将键盘焦点移至消息输入框",
  "actions.general.fe3d3d1e": "常规",
  "actions.add_machine.4bafe6e6": "添加机器",
  "actions.register_another_pi_web_runtime_reachable_from.35e1fecd": "注册此网关可访问的另一台 PI WEB 机器",
  "actions.machine.048e2c5a": "机器",
  "actions.refresh_selected_machine.8a40a2db": "刷新所选机器",
  "actions.check_whether_the_selected_pi_web_runtime.a4a46eb9": "检查所选 PI WEB 机器是否在线",
  "actions.machine.dfdbb581": "机器",
  "actions.open_selected_machine_pi_web.9995f07d": "打开所选机器的 PI WEB",
  "actions.open_the_selected_remote_pi_web_directly.f99665da": "在新标签页直接打开所选远程 PI WEB",
  "actions.machine.3f05cd64": "机器",
  "actions.remove_selected_machine.75497cbc": "移除所选机器",
  "actions.remove_the_selected_remote_machine_from_this.ca6b1d6d": "从此网关移除所选远程机器",
  "actions.machine.461ee431": "机器",
  "actions.add_project.4a60c119": "添加项目",
  "actions.project.ed4e2811": "项目",
  "actions.configure_provider_authentication.2ed9ab70": "配置服务商身份验证",
  "actions.run_login_without_tying_authentication_to_a.7350c3ae": "运行 /login，无需将身份验证绑定到会话",
  "actions.general.4a28eb0e": "常规",
  "actions.remove_provider_authentication.8c6be5d7": "移除服务商身份验证",
  "actions.run_logout_for_stored_pi_credentials.b6eae4f6": "运行 /logout，移除已保存的 Pi 凭据",
  "actions.general.d13363df": "常规",
  "actions.select_theme.1691df69": "选择主题",
  "actions.choose_the_pi_web_color_theme.8d40c8bb": "选择 PI WEB 配色主题",
  "actions.preferences.cf6a379a": "偏好设置",
  "actions.open_settings.92c49354": "打开设置",
  "actions.manage_pi_web_configuration_and_keyboard_shortcuts.044e9ced": "管理 PI WEB 配置和键盘快捷键",
  "actions.preferences.d2996294": "偏好设置",
  "actions.full_page_reload.3a887143": "重新加载页面",
  "actions.reload_the_pi_web_browser_page.7c4fd84f": "重新加载 PI WEB 浏览器页面",
  "actions.general.60f84447": "常规",
  "actions.go_to_chat.68fd294f": "打开对话",
  "actions.navigation.13f63e98": "导航",
  "actions.remove_workspace.16f6abb1": "移除工作区",
  "actions.run_the_owning_provider_s_workspace_removal.cd7c5df2": "执行所属服务商的工作区移除操作",
  "actions.workspace.cce871f5": "工作区",
  "actions.start_session.220b9c40": "开始会话",
  "actions.session.70a8b6f5": "会话",
  "actions.select_model.4cc9080e": "选择模型",
  "actions.choose_the_model_for_the_selected_session.0018f3f7": "为所选会话选择模型",
  "actions.session.78b9d11a": "会话",
  "actions.select_thinking_level.edf8d2db": "选择思考强度",
  "actions.choose_the_thinking_level_for_the_selected.5b621427": "为所选会话选择思考强度",
  "actions.session.240625f7": "会话",
  "actions.archive_session.ff404bda": "归档会话",
  "actions.archive_the_selected_session.f26ff005": "归档所选会话",
  "actions.session.e6ba8c1e": "会话",
  "actions.reload_session_from_disk.9fc8e7de": "从磁盘重新加载会话",
  "actions.close_and_re_open_the_selected_session.6eedf731": "关闭所选会话并从会话文件重新打开。要重新加载 Pi 运行时资源，请在输入框中使用 /reload。",
  "actions.session.e4ee5769": "会话",
  "actions.delete_new_session.7d7dfab3": "删除新会话",
  "actions.delete_the_selected_transient_new_session.84247e6b": "删除所选临时新会话",
  "actions.session.92689c5e": "会话",
  "actions.stop_active_work.bdab995e": "停止当前任务",
  "actions.session.3e1026ef": "会话",
  "messageActions.clone_session_from_this_message.9626ddbf": "从此消息克隆会话",
  "messageActions.are_you_sure_you_want_to_fork.bd452d07": "确定要从此处创建会话分支吗？",
  "messageActions.go_back_to_this_message.d44041bf": "回到此消息",
  "messageActions.copy_message.f3147506": "复制消息",
  "messageActions.unable_to_copy_message_to_the_clipboard.21bce1a6": "无法将消息复制到剪贴板。",
  "messageActions.copied.3064c989": "已复制",
  "requiredTerminalFacade.required_terminal_plugin_is_unavailable_open_settings.583780da": "必需的终端插件不可用。请打开设置查看恢复说明。",
  "index.pi_web_themes.6663ecf4": "PI WEB 主题",
  "index.pi_web_dark.51bac711": "PI WEB 深色",
  "index.dark_pi_web_palette.9d5fbeb1": "PI WEB 深色配色。",
  "index.pi_web_light.dd6a1beb": "PI WEB 浅色",
  "index.light_pi_web_palette.d45dbe6a": "PI WEB 浅色配色。",
  "index.pi_web_classic.cc134564": "PI WEB 经典",
  "index.the_original_pi_web_dark_palette.6f693699": "PI WEB 原版深色配色。",
  "index.follow_the_system_light_dark_preference_with.28897196": "让 PI WEB 主题跟随系统的深浅色偏好。",
  "promptAttachmentCapture.failed_to_read_an_attachment.21c67d96": "读取附件失败。",
  "queuedMessageActions.attachments.1ca45bcc": "附件",
  "queuedMessageActions.recall_this_message_only_its_text_will.5f2f2b2c": "撤回此消息吗？只有文字会返回输入框，附件将丢失。",
  "queuedMessageActions.recall_this_message.ba2603c0": "撤回此消息吗？",
  "queuedMessageActions.and.8baf3888": "和",
  "sessionCleanupUi.enable_at_least_one_cleanup_action.8cb29151": "请至少启用一项清理操作。",
  "sessionCleanupUi.archive_idle_sessions_after.92b2a096": "归档空闲会话的等待天数",
  "sessionCleanupUi.delete_archived_sessions_after.065bc56a": "删除已归档会话的等待天数",
  "sessionCleanupUi.run_cleanup.098962bc": "执行清理",
  "sessionCleanupUi.and.bc628534": "，并",
  "sessionNotifications.error.0a26ce62": "错误",
  "sessionNotifications.warning.03a33f0e": "警告",
  "sessionNotifications.info.cbbe95c6": "信息",
  "sessionTreeModel.enter_custom_summary_focus_instructions.59bcedbd": "请输入自定义摘要重点说明。",
  "settings.language.title": "语言",
  "settings.language.description": "选择此设备上的界面语言。",
  "settings.language.system": "跟随浏览器语言",
  "settings.language.apply": "应用并刷新",
  "settings.language.hint": "切换语言将刷新页面。",
  "settings.language.saveFailed": "无法保存语言偏好，请检查浏览器存储设置。",
  "ui.role.user": "你",
  "ui.role.assistant": "Pi",
  "ui.role.tool": "工具",
  "ui.thinking.off": "关闭",
  "ui.thinking.minimal": "极低",
  "ui.thinking.low": "低",
  "ui.thinking.medium": "中",
  "ui.thinking.high": "高",
  "ui.thinking.xhigh": "极高",
  "ui.auth.error": "登录失败",
  "ui.auth.cancelled": "已取消",
  "ui.plugin.health.healthy": "正常",
  "ui.plugin.health.degraded": "降级",
  "ui.plugin.health.unhealthy": "异常",
  "ui.plugin.safe.off": "关闭",
  "ui.plugin.safe.bundled-only": "仅内置插件",
  "ui.plugin.safe.none": "不加载服务端插件",
  "ui.plugin.scope.user": "用户范围",
  "ui.plugin.scope.project": "项目范围",
  "ui.plugin.scope.local": "本地范围",
  "ui.plugin.scope.bundled": "内置范围",
  "ui.session.action.archive": "归档",
  "ui.session.action.delete": "删除"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "ActionPalette.template.6b24d700": {
    "sourceHash": 1687743574,
    "valueCount": 8,
    "strings": [
      "\n      <modal-surface\n        .onClose=",
      "\n        .initialFocus=",
      "\n        .label=",
      "\n        @keydown=",
      "\n      >\n        <header>\n          <input\n            .value=",
      "\n            placeholder=\"搜索页面和命令…\"\n            @input=",
      "\n          >\n          <button title=\"关闭\" aria-label=\"关闭\" @click=",
      ">×</button>\n        </header>\n        <div class=\"options\">\n          ",
      "\n        </div>\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7
    ]
  },
  "ActionPalette.no_actions_found.9d04ad76": {
    "sourceHash": 559077592,
    "valueCount": 0,
    "strings": [
      "<div class=\"empty\">没有匹配的页面或命令。</div>"
    ],
    "order": []
  },
  "AskUserCard.questions_of_answered_skip_questions.9742eb96": {
    "sourceHash": 4118082950,
    "valueCount": 7,
    "strings": [
      "\n      <article class=\"card open-card\" aria-labelledby=\"ask-user-heading\">\n        <header class=\"card-header\">\n          <h2 id=\"ask-user-heading\">问题</h2>\n          <span class=\"header-status\" role=\"status\" aria-live=\"polite\" aria-atomic=\"true\">\n            已回答 ",
      " / ",
      " 个问题\n          </span>\n        </header>\n        <form class=\"ask-form\" @submit=",
      ">\n          <div class=\"questions\">\n            ",
      "\n          </div>\n          <footer class=\"form-footer\">\n            <button class=\"secondary-action skip-questions\" type=\"button\" ?disabled=",
      "\n              @click=",
      ">跳过问题</button>\n            ",
      "\n          </footer>\n        </form>\n      </article>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ]
  },
  "AskUserCard.custom.3c0d5239": {
    "sourceHash": 843192496,
    "valueCount": 4,
    "strings": [
      "\n            <label class=\"option other-option\">\n              <input\n                type=",
      "\n                name=",
      "\n                value=\"__pi_web_other__\"\n                .checked=",
      "\n                @change=",
      "\n              />\n              <span class=\"option-copy\"><span class=\"option-label\">自定义</span></span>\n            </label>\n          "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "AskUserCard.custom_answer.571bfe1a": {
    "sourceHash": 3133112210,
    "valueCount": 5,
    "strings": [
      "\n            <label class=\"other-answer\" for=",
      ">\n              <span>自定义回答</span>\n              <textarea\n                id=",
      "\n                rows=\"3\"\n                maxlength=",
      "\n                .value=",
      "\n                @input=",
      "\n              ></textarea>\n            </label>\n          "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "AskUserCard.send_without_answering_keep_editing.7a8e81c0": {
    "sourceHash": 4229295926,
    "valueCount": 5,
    "strings": [
      "\n      <div class=\"partial-confirmation\" role=\"group\" aria-label=\"确认部分回答\">\n        <p>\n          <strong>发送时将不回答：</strong>\n          ",
      "?\n        </p>\n        <div class=\"confirmation-actions\">\n          <button class=\"secondary-action\" type=\"button\" @click=",
      ">继续编辑</button>\n          <button class=\"primary-action send-anyway\" type=\"button\" ?disabled=",
      " @click=",
      ">\n            ",
      "\n          </button>\n        </div>\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "AskUserCard.questions_closed_questions.a3bcefce": {
    "sourceHash": 2908723945,
    "valueCount": 3,
    "strings": [
      "\n      <details class=\"card closed-card\">\n        <summary class=\"card-header\"><h2><span class=\"disclosure-indicator\" aria-hidden=\"true\">▸</span> 问题</h2><span class=\"header-status\">已关闭 · ",
      " 个问题</span></summary>\n        ",
      "\n        <div class=\"record-questions\">\n          ",
      "\n        </div>\n      </details>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "AskUserCard.multiple_choices_allowed.13fd6707": {
    "sourceHash": 1941003909,
    "valueCount": 0,
    "strings": [
      "<p class=\"question-detail\">可多选</p>"
    ],
    "order": []
  },
  "AskUserCard.unanswered.7733faef": {
    "sourceHash": 2909476229,
    "valueCount": 0,
    "strings": [
      "<p class=\"unanswered-record\">未回答</p>"
    ],
    "order": []
  },
  "AskUserCard.custom.7852b995": {
    "sourceHash": 2629714532,
    "valueCount": 1,
    "strings": [
      "<li><strong>自定义：</strong> <span class=\"other-record-text\">",
      "</span></li>"
    ],
    "order": [
      0
    ]
  },
  "AskUserCard.draft_answer_not_sent.3b3ec1f0": {
    "sourceHash": 1849940406,
    "valueCount": 0,
    "strings": [
      "<p class=\"draft-note\">回答草稿 · 未发送</p>"
    ],
    "order": []
  },
  "AuthDialog.template.5bfc64fa": {
    "sourceHash": 247525021,
    "valueCount": 7,
    "strings": [
      "\n      <modal-surface\n        .onClose=",
      "\n        .initialFocus=",
      "\n        .label=",
      "\n        @keydown=",
      "\n      >\n        <header>\n          <strong>",
      "</strong>\n          <button title=\"关闭\" aria-label=\"关闭\" @click=",
      ">×</button>\n        </header>\n        ",
      "\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ]
  },
  "AuthDialog.login_to.f534145c": {
    "sourceHash": 928516379,
    "valueCount": 1,
    "strings": [
      "登录 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "AuthDialog.template.c5f78314": {
    "sourceHash": 3513356443,
    "valueCount": 2,
    "strings": [
      "\n        <input aria-label=\"搜索服务商\" placeholder=\"搜索服务商\" .value=",
      " @input=",
      ">\n      "
    ],
    "order": [
      0,
      1
    ]
  },
  "AuthDialog.no_matching_providers.6b986890": {
    "sourceHash": 934629550,
    "valueCount": 0,
    "strings": [
      "<div class=\"empty\">没有匹配的服务商</div>"
    ],
    "order": []
  },
  "AuthDialog.open_this_authorization_link.bbd3440b": {
    "sourceHash": 1658362166,
    "valueCount": 3,
    "strings": [
      "\n          <p>打开此授权链接：</p>\n          <p><a href=",
      " target=\"_blank\" rel=\"noreferrer\">",
      "</a></p>\n          ",
      "\n        "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "AuthDialog.enter_code.ee4724bb": {
    "sourceHash": 2202595493,
    "valueCount": 1,
    "strings": [
      "\n            <p class=\"warning\">输入代码： <code>",
      "</code></p>\n          "
    ],
    "order": [
      0
    ]
  },
  "AuthDialog.starting_login_flow.be26d72e": {
    "sourceHash": 787470099,
    "valueCount": 0,
    "strings": [
      "<p>正在启动登录流程…</p>"
    ],
    "order": []
  },
  "AuthDialog.after_you_approve_the_redirect_page_will.321c0917": {
    "sourceHash": 535282240,
    "valueCount": 0,
    "strings": [
      "<p class=\"warning\">授权后，重定向页面可能无法加载，这是预期情况。请从浏览器地址栏复制完整 URL 并粘贴到下方。</p>"
    ],
    "order": []
  },
  "AuthDialog.template.b3cb1a23": {
    "sourceHash": 3096509905,
    "valueCount": 1,
    "strings": [
      "\n          <div class=\"info-links\" aria-label=\"相关信息\">\n            ",
      "\n          </div>\n        "
    ],
    "order": [
      0
    ]
  },
  "AuthDialog.cancel_submit.05d1242f": {
    "sourceHash": 1351942195,
    "valueCount": 9,
    "strings": [
      "\n          <label>",
      "</label>\n          <input type=",
      " autocomplete=",
      " .value=",
      " placeholder=",
      " @input=",
      ">\n          <div class=\"actions\"><button @click=",
      ">取消</button><button class=\"primary\" ?disabled=",
      " @click=",
      ">提交</button></div>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ]
  },
  "AuthDialog.close.686f543f": {
    "sourceHash": 1061989528,
    "valueCount": 2,
    "strings": [
      "<div class=\"error-text\">",
      "</div><div class=\"actions\"><button @click=",
      ">关闭</button></div>"
    ],
    "order": [
      0,
      1
    ]
  },
  "AuthDialog.cancel.a8243a20": {
    "sourceHash": 1088552866,
    "valueCount": 1,
    "strings": [
      "<div class=\"actions\"><button @click=",
      ">取消</button></div>"
    ],
    "order": [
      0
    ]
  },
  "AuthDialog.env.eb248a90": {
    "sourceHash": 443185267,
    "valueCount": 1,
    "strings": [
      "✓ 环境变量",
      ""
    ],
    "order": [
      0
    ]
  },
  "ChatView.pending.b2266fa7": {
    "sourceHash": 946998094,
    "valueCount": 1,
    "strings": [
      "",
      " 条待发送"
    ],
    "order": [
      0
    ]
  },
  "ChatView.output.d2396e67": {
    "sourceHash": 2513074516,
    "valueCount": 1,
    "strings": [
      "",
      " 输出"
    ],
    "order": [
      0
    ]
  },
  "ChatView.template.0c3846b0": {
    "sourceHash": 2002287318,
    "valueCount": 24,
    "strings": [
      "\n      ",
      "\n      ",
      "\n      <div class=",
      ">\n        <div class=\"chat\" @image-open=",
      "\n          @scroll=",
      "\n          @toggle=",
      "\n          @wheel=",
      "\n          @touchstart=",
      "\n          @touchmove=",
      "\n          @touchend=",
      "\n          @touchcancel=",
      ">\n          ",
      "\n          ",
      "\n          ",
      "\n          ",
      "\n          ",
      "\n          ",
      "\n        </div>\n        ",
      "\n        <nav class=\"chat-jumps\" aria-label=\"对话导航\">\n          <button type=\"button\" title=\"跳到顶部\" aria-label=\"跳到顶部\" @click=",
      ">↑</button>\n          <button type=\"button\" class=",
      "\n            title=",
      "\n            aria-label=\"跳到末尾\" aria-describedby=\"chat-follow-state\" @click=",
      ">↓</button>\n          <span id=\"chat-follow-state\" class=\"visually-hidden\">",
      "</span>\n        </nav>\n      </div>\n      ",
      "\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23
    ]
  },
  "ChatView.clear.d121edb1": {
    "sourceHash": 2934544692,
    "valueCount": 13,
    "strings": [
      "\n      <section class=",
      " role=\"region\" aria-labelledby=\"session-notifications-heading\" @focusout=",
      ">\n        <header class=\"notification-header\" data-notification-focus=\"header\" tabindex=\"-1\">\n          <strong class=\"notification-heading\" id=\"session-notifications-heading\">",
      "</strong>\n          <div class=\"notification-header-actions\">\n            <button\n              type=\"button\"\n              class=\"notification-control notification-clear\"\n              aria-label=\"清除所有通知\"\n              title=\"清除所有通知\"\n              ?disabled=",
      "\n              @click=",
      "\n            >清除</button>\n            <button\n              type=\"button\"\n              class=\"notification-control notification-toggle\"\n              aria-label=",
      "\n              title=",
      "\n              aria-expanded=",
      "\n              aria-controls=\"session-notification-list\"\n              @click=",
      "\n            >",
      "</button>\n          </div>\n        </header>\n        <div class=\"notification-list\" id=\"session-notification-list\" ?hidden=",
      ">\n          ",
      "\n          ",
      "\n        </div>\n      </section>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12
    ]
  },
  "ChatView.template.3a3f9435": {
    "sourceHash": 1611451364,
    "valueCount": 11,
    "strings": [
      "\n              <article class=",
      " data-notification-id=",
      " tabindex=\"-1\">\n                <div class=\"notification-metadata\">\n                  <strong class=\"notification-severity\">",
      "</strong>\n                  <span aria-hidden=\"true\">·</span>\n                  <time datetime=",
      ">",
      "</time>\n                </div>\n                <p class=\"notification-message\" dir=\"auto\">",
      "</p>\n                ",
      "\n                <button\n                  type=\"button\"\n                  class=\"notification-row-dismiss\"\n                  aria-label=",
      "\n                  title=\"关闭通知\"\n                  ?disabled=",
      "\n                  @click=",
      "\n                >",
      "</button>\n              </article>\n            "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ]
  },
  "ChatView.minimise.bec3fbef": {
    "sourceHash": 750847123,
    "valueCount": 1,
    "strings": [
      "\n          <div class=\"session-warnings-controls\">\n            <button\n              type=\"button\"\n              class=\"session-warnings-collapse\"\n              title=\"收起警告\"\n              aria-label=\"收起警告\"\n              @click=",
      "\n            >\n              <svg class=\"session-warnings-collapse-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\">\n                <path d=\"m18 15-6-6-6 6\"></path>\n              </svg>\n              <span>收起</span>\n            </button>\n          </div>\n        "
    ],
    "order": [
      0
    ]
  },
  "ChatView.template.f44ad199": {
    "sourceHash": 1797752273,
    "valueCount": 1,
    "strings": [
      "\n              <button\n                type=\"button\"\n                class=\"session-warning-dismiss\"\n                title=\"不再显示此警告\"\n                aria-label=\"关闭警告\"\n                @click=",
      "\n              >×</button>\n            "
    ],
    "order": [
      0
    ]
  },
  "ChatView.template.c235a861": {
    "sourceHash": 3789279445,
    "valueCount": 3,
    "strings": [
      "\n          <button type=\"button\" class=\"image-zoom-close\" aria-label=\"关闭图片\" @click=",
      ">×</button>\n          <img class=\"image-zoom-full\" src=",
      " alt=",
      " />\n        "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "ChatView.sending_your_message.b690fb4f": {
    "sourceHash": 253853912,
    "valueCount": 0,
    "strings": [
      "\n        <div class=\"activity-dock active\" aria-live=\"polite\">\n          <span class=\"dot\"></span>\n          <span class=\"activity-text\">正在发送消息…</span>\n        </div>\n      "
    ],
    "order": []
  },
  "ChatView.template.7fc930d1": {
    "sourceHash": 2555617228,
    "valueCount": 3,
    "strings": [
      "\n            <button type=\"button\" class=\"queued-clear-button\" ?disabled=",
      " aria-label=\"清空队列\" title=\"清空排队消息并保留当前工作\" @click=",
      ">",
      "</button>\n          "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "ChatView.template.e0249d26": {
    "sourceHash": 3524043235,
    "valueCount": 13,
    "strings": [
      "\n          <div class=\"queued-message\">\n            <div class=\"queued-message-header\">\n              <div class=\"queued-message-meta\">\n                <span class=\"queued-kind\">",
      " ",
      "</span>\n                ",
      "\n              </div>\n              <div class=\"queued-message-actions\">\n                <button type=\"button\" class=\"queued-action\" aria-label=\"复制排队消息\" title=\"复制消息\" @click=",
      ">",
      "</button>\n                ",
      "\n              </div>\n            </div>\n            <formatted-text .imagesEnabled=",
      " .codeBlocks=",
      " .intentKey=",
      " .contentRendering=",
      " .machineId=",
      " .workspaceContext=",
      " .text=",
      "></formatted-text>\n          </div>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12
    ]
  },
  "ChatView.template.4b41b982": {
    "sourceHash": 2149568387,
    "valueCount": 1,
    "strings": [
      "\n                  <span class=\"queued-attachments\" title=\"此排队消息包含附件\"><span aria-hidden=\"true\">📎</span> ",
      "</span>\n                "
    ],
    "order": [
      0
    ]
  },
  "ChatView.template.29b9a192": {
    "sourceHash": 4175469544,
    "valueCount": 13,
    "strings": [
      "\n                  <button type=\"button\" class=\"queued-action\" ?disabled=",
      " title=",
      " aria-label=",
      " @click=",
      ">",
      "</button>\n                  <button type=\"button\" class=\"queued-action\" ?disabled=",
      " aria-label=\"取回排队消息\" title=",
      " @click=",
      ">",
      "</button>\n                  <button type=\"button\" class=\"queued-action\" ?disabled=",
      " aria-label=\"移除排队消息\" title=",
      " @click=",
      ">",
      "</button>\n                "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12
    ]
  },
  "ChatView.suggested_input_replaces_your_current_draft_nothing.1d449cdb": {
    "sourceHash": 978256902,
    "valueCount": 3,
    "strings": [
      "\n      <aside class=\"suggested-input\">\n        <div class=\"suggested-input-header\">\n          <strong>建议输入</strong>\n          ",
      "\n        </div>\n        <p class=\"suggested-input-text\" dir=\"auto\">",
      "</p>\n        <small>替换当前草稿，不会发送。</small>\n        <button type=\"button\" class=\"suggested-input-use\" @click=",
      ">使用建议输入</button>\n      </aside>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "ChatView.template.928ca7f8": {
    "sourceHash": 3495749278,
    "valueCount": 1,
    "strings": [
      "\n            <button type=\"button\" class=\"suggested-input-dismiss\" aria-label=\"关闭建议输入\" title=\"在此浏览器中关闭建议输入\"\n              @click=",
      ">×</button>\n          "
    ],
    "order": [
      0
    ]
  },
  "ChatView.more_extension_queued.9f0718e6": {
    "sourceHash": 3676889706,
    "valueCount": 2,
    "strings": [
      "<p class=\"queued-dialogs\" role=\"status\">另有 ",
      " 个扩展对话框排队中</p>"
    ],
    "order": [
      0
    ]
  },
  "ChatView.compacting_history_the_agent_is_summarizing_earlier.96ff51f8": {
    "sourceHash": 4221223309,
    "valueCount": 1,
    "strings": [
      "\n      <aside class=\"session-activity compacting\" aria-live=\"polite\">\n        <strong>正在压缩历史…</strong>\n        <span>代理正在总结早期上下文。新消息将在压缩完成后发送。</span>\n        ",
      "\n      </aside>\n    "
    ],
    "order": [
      0
    ]
  },
  "ChatView.queued.ee85bfd1": {
    "sourceHash": 2166419213,
    "valueCount": 2,
    "strings": [
      "<small>",
      " 条消息排队中</small>"
    ],
    "order": [
      0
    ]
  },
  "ChatView.loading_earlier_messages.7cd28bec": {
    "sourceHash": 244095677,
    "valueCount": 1,
    "strings": [
      "<div class=\"history-boundary\"><span>正在加载更早的消息…</span>",
      "</div>"
    ],
    "order": [
      0
    ]
  },
  "ChatView.load_earlier_messages.5bea8e73": {
    "sourceHash": 2117269370,
    "valueCount": 4,
    "strings": [
      "\n      <div class=\"history-boundary\">\n        <button type=\"button\" class=\"history-load-button\" ?disabled=",
      " @click=",
      ">加载更早的消息</button>\n        ",
      "\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "ChatView.scroll_up_to_load_earlier_messages.ab9a8e61": {
    "sourceHash": 838131891,
    "valueCount": 0,
    "strings": [
      "<span>向上滚动以加载更早的消息</span>"
    ],
    "order": []
  },
  "ChatView.beginning_of_session.2244d192": {
    "sourceHash": 3649571189,
    "valueCount": 1,
    "strings": [
      "<div class=\"history-boundary\"><span>会话起点</span>",
      "</div>"
    ],
    "order": [
      0
    ]
  },
  "ChatView.showing_messages_of.187d4d56": {
    "sourceHash": 2573874445,
    "valueCount": 3,
    "strings": [
      "<small>显示第 ",
      "–",
      " 条消息，共 ",
      " 条</small>"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "ChatView.template.795c3fae": {
    "sourceHash": 1823223639,
    "valueCount": 2,
    "strings": [
      "\n      <div class=\"msg-actions\" aria-label=\"消息工具栏\">\n        ",
      "\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "ChatView.thinking.acdb2bf0": {
    "sourceHash": 3334821674,
    "valueCount": 7,
    "strings": [
      "<details class=\"part\"><summary>思考过程</summary><formatted-text .imagesEnabled=",
      " .codeBlocks=",
      " .intentKey=",
      " .contentRendering=",
      " .machineId=",
      " .workspaceContext=",
      " .text=",
      "></formatted-text></details>"
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ]
  },
  "ChatView.skill.a1debad5": {
    "sourceHash": 543972527,
    "valueCount": 9,
    "strings": [
      "\n      <details class=\"part skill-invocation\">\n        <summary><b>[技能]</b> ",
      "</summary>\n        <small>",
      "</small>\n        <formatted-text .imagesEnabled=",
      " .codeBlocks=",
      " .intentKey=",
      " .contentRendering=",
      " .machineId=",
      " .workspaceContext=",
      " .text=",
      "></formatted-text>\n      </details>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ]
  },
  "ChatView.loaded_read.3e594809": {
    "sourceHash": 1732213095,
    "valueCount": 2,
    "strings": [
      "\n      <div class=\"part skill-read\">\n        <strong>技能参考：",
      "</strong>\n        <small>来源：",
      "</small>\n      </div>\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "CommandPicker.template.ac370c64": {
    "sourceHash": 803254384,
    "valueCount": 10,
    "strings": [
      "\n      <modal-surface\n        .onClose=",
      "\n        .initialFocus=",
      "\n        .label=",
      "\n        @keydown=",
      "\n      >\n        <header>\n          <strong>",
      "</strong>\n          <button aria-label=\"关闭\" @click=",
      ">×</button>\n        </header>\n        ",
      "\n        ",
      "\n        <div class=\"options\" tabindex=\"0\">\n          ",
      "\n          ",
      "\n        </div>\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9
    ]
  },
  "CommandPicker.template.c8c7219f": {
    "sourceHash": 4017907794,
    "valueCount": 2,
    "strings": [
      "<input placeholder=\"搜索\" .value=",
      " @input=",
      ">"
    ],
    "order": [
      0,
      1
    ]
  },
  "CommandPicker.no_matching_options.d4a7964c": {
    "sourceHash": 3492662518,
    "valueCount": 0,
    "strings": [
      "<div class=\"empty\">没有匹配的选项</div>"
    ],
    "order": []
  },
  "ContentRendererHost.template.629c2610": {
    "sourceHash": 3447651047,
    "valueCount": 3,
    "strings": [
      "<div class=\"controls code-block-header\" role=\"group\" aria-label=\"代码块控件\">\n        ",
      "\n        ",
      "\n        ",
      "\n      </div>"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "ContentRendererHost.template.95814392": {
    "sourceHash": 774655369,
    "valueCount": 2,
    "strings": [
      "\n          <select class=\"code-block-label\" aria-label=\"图表渲染器\" @change=",
      ">\n            ",
      "\n          </select>\n        "
    ],
    "order": [
      0,
      1
    ]
  },
  "ContentRendererHost.raw.025d8adb": {
    "sourceHash": 3691468865,
    "valueCount": 5,
    "strings": [
      "\n          <button type=\"button\" aria-controls=\"content\" aria-pressed=",
      " @click=",
      ">",
      "</button>\n          <button type=\"button\" aria-controls=\"content\" aria-pressed=",
      " @click=",
      ">源码</button>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "ContentRendererHost.template.35c94939": {
    "sourceHash": 4121275941,
    "valueCount": 2,
    "strings": [
      "<div class=",
      " tabindex=\"0\" aria-label=\"原始源码\">",
      "</div>"
    ],
    "order": [
      0,
      1
    ]
  },
  "ContentRendererHost.template.21921372": {
    "sourceHash": 9359014,
    "valueCount": 2,
    "strings": [
      "<pre class=",
      " tabindex=\"0\" aria-label=\"原始源码\"><code>",
      "</code></pre>"
    ],
    "order": [
      0,
      1
    ]
  },
  "ContentRendererHost.template.5787b0d5": {
    "sourceHash": 1545369873,
    "valueCount": 1,
    "strings": [
      "<div class=\"preview\" tabindex=\"0\" aria-label=\"图表预览\">",
      "</div>"
    ],
    "order": [
      0
    ]
  },
  "DefaultPin.use_as_default_for_new_sessions.023b0da7": {
    "sourceHash": 4230610343,
    "valueCount": 1,
    "strings": [
      "将 ",
      " 设为新会话默认值"
    ],
    "order": [
      0
    ]
  },
  "DefaultPin.new_session_default.806aea3c": {
    "sourceHash": 3472376160,
    "valueCount": 0,
    "strings": [
      "<div class=\"default-help\"><strong>新会话默认值</strong></div>"
    ],
    "order": []
  },
  "ExtensionDialogCard.answered.be968566": {
    "sourceHash": 856394438,
    "valueCount": 1,
    "strings": [
      "回答： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "ExtensionDialogCard.answered.d6bca1f1": {
    "sourceHash": 856394438,
    "valueCount": 1,
    "strings": [
      "回答： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "ExtensionDialogCard.auto_cancels_in_h_m.f0c36706": {
    "sourceHash": 2336084290,
    "valueCount": 2,
    "strings": [
      "",
      " 小时 ",
      " 分钟后自动取消"
    ],
    "order": [
      0,
      1
    ]
  },
  "ExtensionDialogCard.auto_cancels_in_m_s.9cef84e5": {
    "sourceHash": 3590438161,
    "valueCount": 2,
    "strings": [
      "",
      " 分 ",
      " 秒后自动取消"
    ],
    "order": [
      0,
      1
    ]
  },
  "ExtensionDialogCard.auto_cancels_in_s.999a7ae0": {
    "sourceHash": 2035628700,
    "valueCount": 1,
    "strings": [
      "",
      " 秒后自动取消"
    ],
    "order": [
      0
    ]
  },
  "ExtensionDialogCard.cancel_no_yes.a6d8971a": {
    "sourceHash": 1444737614,
    "valueCount": 7,
    "strings": [
      "\n      ",
      "\n      <footer class=\"dialog-footer\">\n        <button class=\"secondary-action\" type=\"button\" ?disabled=",
      " @click=",
      ">取消</button>\n        <button class=\"secondary-action\" type=\"button\" ?disabled=",
      " @click=",
      ">否</button>\n        <button class=\"primary-action\" type=\"button\" ?disabled=",
      " @click=",
      ">是</button>\n      </footer>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ]
  },
  "ExtensionDialogCard.cancel.37322fb4": {
    "sourceHash": 2746740484,
    "valueCount": 3,
    "strings": [
      "\n      <div class=\"dialog-options\" role=\"group\" aria-label=\"选项\">\n        ",
      "\n      </div>\n      <footer class=\"dialog-footer\">\n        <button class=\"secondary-action\" type=\"button\" ?disabled=",
      " @click=",
      ">取消</button>\n      </footer>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "ExtensionDialogCard.cancel.936a1f9b": {
    "sourceHash": 1198342969,
    "valueCount": 10,
    "strings": [
      "\n      <form class=\"dialog-input-form\" @submit=",
      ">\n        <input\n          class=\"dialog-input\"\n          type=\"text\"\n          name=\"dialog-answer\"\n          aria-label=\"你的回答\"\n          placeholder=",
      "\n          maxlength=",
      "\n          .value=",
      "\n          ?disabled=",
      "\n          @input=",
      "\n        />\n        <footer class=\"dialog-footer\">\n          <button class=\"secondary-action\" type=\"button\" ?disabled=",
      " @click=",
      ">取消</button>\n          <button class=\"primary-action\" type=\"submit\" ?disabled=",
      ">",
      "</button>\n        </footer>\n      </form>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9
    ]
  },
  "ExtensionDialogCard.dismiss.3525aa13": {
    "sourceHash": 1512544550,
    "valueCount": 5,
    "strings": [
      "\n      <article class=\"card closed-card\" aria-labelledby=\"extension-dialog-closed-heading\">\n        <header class=\"card-header\">\n          <h2 id=\"extension-dialog-closed-heading\">",
      "</h2>\n          <span class=",
      ">",
      "</span>\n        </header>\n        <p class=\"closed-summary\">",
      "</p>\n        <footer class=\"dialog-footer\">\n          <button class=\"secondary-action\" type=\"button\" @click=",
      ">关闭</button>\n        </footer>\n      </article>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "ImagePresentation.template.97409eaa": {
    "sourceHash": 85179579,
    "valueCount": 16,
    "strings": [
      "\n      <div class=\"frame\">\n        <button class=\"placeholder\" type=\"button\" ?hidden=",
      " ?disabled=",
      "\n          @click=",
      ">\n          <span>",
      "</span>",
      "\n        </button>\n        <button class=\"image-button\" type=\"button\" ?hidden=",
      " ?disabled=",
      "\n          aria-label=",
      " title=\"点击放大\"\n          @click=",
      "\n          @keydown=",
      ">\n          <img loading=\"lazy\" decoding=\"async\" src=",
      " alt=",
      "\n            @load=",
      "\n            width=",
      " height=",
      "\n            style=",
      " />\n        </button>\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ]
  },
  "ImagePresentation.enlarge.718d8165": {
    "sourceHash": 1902288855,
    "valueCount": 1,
    "strings": [
      "放大",
      ""
    ],
    "order": [
      0
    ]
  },
  "MachineDialog.add_machine_remote_pi_web_url_cancel.98f8e499": {
    "sourceHash": 2580079677,
    "valueCount": 15,
    "strings": [
      "\n      <modal-surface\n        .onClose=",
      "\n        .initialFocus=",
      "\n        .label=",
      "\n        @keydown=",
      "\n      >\n        <form @submit=",
      ">\n          <header>\n            <strong>添加机器</strong>\n            <button type=\"button\" @click=",
      " aria-label=\"关闭\">×</button>\n          </header>\n          <div class=\"body\">\n            ",
      "\n            <label>\n              远程 PI WEB URL\n              <input name=\"baseUrl\" type=\"url\" .value=",
      " @input=",
      " placeholder=\"http://dev-box.local:8504\" autocomplete=\"url\" inputmode=\"url\" />\n            </label>\n            <small class=",
      ">",
      "</small>\n            ",
      "\n          </div>\n          <footer>\n            <button type=\"button\" @click=",
      ">取消</button>\n            <button class=\"primary\" type=\"submit\" ?disabled=",
      ">",
      "</button>\n          </footer>\n        </form>\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14
    ]
  },
  "MachineDialog.machine_name_suggested_from_the_url_edit.82f62b17": {
    "sourceHash": 3022849799,
    "valueCount": 5,
    "strings": [
      "\n              <label>\n                机器名称\n                <input name=\"name\" type=\"text\" .value=",
      " @input=",
      " placeholder=",
      " autocomplete=\"off\" />\n              </label>\n              <small class=\"hint\">根据 URL 自动建议。可修改为更易识别的侧栏名称。</small>\n              <label>\n                Bearer 令牌 <span class=\"optional\">可选</span>\n                <input name=\"token\" type=\"password\" .value=",
      " @input=",
      " placeholder=\"远程机器不需要令牌时留空\" autocomplete=\"off\" />\n              </label>\n              <small class=\"hint\">仅粘贴令牌值；PI WEB 会通过 Authorization: Bearer 请求头发送。</small>\n            "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "MachineDialog.after_you_enter_a_url_pi_web.054607d3": {
    "sourceHash": 3835001904,
    "valueCount": 0,
    "strings": [
      "<p class=\"hint intro\">输入 URL 后，PI WEB 将建议机器名称，并允许添加可选的 Bearer 令牌。</p>"
    ],
    "order": []
  },
  "MachineList.template.dfda7036": {
    "sourceHash": 2540346267,
    "valueCount": 5,
    "strings": [
      "\n      <div class=\"action-menu\">\n        <button\n          class=\"action-menu-toggle\"\n          title=\"机器操作\"\n          aria-label=",
      "\n          aria-expanded=",
      "\n          aria-controls=",
      "\n          @click=",
      "\n        >⋯</button>\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "MachineList.actions_for.a3386ee2": {
    "sourceHash": 1417897721,
    "valueCount": 1,
    "strings": [
      "",
      " 的操作"
    ],
    "order": [
      0
    ]
  },
  "MachineList.remove.8ab88fda": {
    "sourceHash": 393900298,
    "valueCount": 5,
    "strings": [
      "\n          <div class=\"action-menu-panel machine-menu-panel\" id=",
      " style=",
      " @click=",
      ">\n            <button class=\"danger\" title=",
      " @click=",
      ">移除</button>\n          </div>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "MachineList.remove.fa5fdf70": {
    "sourceHash": 1821224573,
    "valueCount": 1,
    "strings": [
      "移除 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "MachineList.machines.f75d1d80": {
    "sourceHash": 579830920,
    "valueCount": 0,
    "strings": [
      "<span>机器</span>"
    ],
    "order": []
  },
  "MachineList.machines.bc37920a": {
    "sourceHash": 1733645080,
    "valueCount": 5,
    "strings": [
      "<button class=\"section-toggle\" aria-expanded=",
      " @click=",
      "><span class=\"section-title\"><span class=\"section-name\">",
      " 机器</span>",
      "</span><small class=\"section-count\">",
      "</small></button>"
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "MachineSwitcher.machine.8b398990": {
    "sourceHash": 1320241647,
    "valueCount": 11,
    "strings": [
      "\n      <div class=\"machine-switcher\">\n        <button\n          type=\"button\"\n          class=\"machine-switcher-button\"\n          title=",
      "\n          aria-label=",
      "\n          aria-expanded=",
      "\n          @click=",
      "\n          @keydown=",
      "\n        >\n          ",
      "\n          ",
      "\n          <span class=\"machine-switcher-text\">\n            <span class=\"machine-switcher-kicker\">机器</span>\n            <span class=\"machine-switcher-label\">",
      "</span>\n          </span>\n          <span class=",
      ">",
      "</span>\n          <span class=\"machine-chevron\" aria-hidden=\"true\">▾</span>\n        </button>\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ]
  },
  "MachineSwitcher.template.99c7c152": {
    "sourceHash": 3994617925,
    "valueCount": 4,
    "strings": [
      "\n          <div class=\"machine-option-actions\">\n            <button\n              type=\"button\"\n              class=\"machine-option-actions-toggle\"\n              title=\"机器操作\"\n              aria-label=",
      "\n              aria-expanded=",
      "\n              @click=",
      "\n            >⋯</button>\n            ",
      "\n          </div>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "MachineSwitcher.actions_for.86e47525": {
    "sourceHash": 1417897721,
    "valueCount": 1,
    "strings": [
      "",
      " 的操作"
    ],
    "order": [
      0
    ]
  },
  "MachineSwitcher.remove.5b9e2913": {
    "sourceHash": 1101632705,
    "valueCount": 4,
    "strings": [
      "\n              <div class=\"machine-option-actions-panel\" style=",
      " @click=",
      ">\n                <button class=\"danger\" title=",
      " @click=",
      ">移除</button>\n              </div>\n            "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "MachineSwitcher.remove.0d9de645": {
    "sourceHash": 1821224573,
    "valueCount": 1,
    "strings": [
      "移除 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "MachineSwitcher.machine_switch_machine.38ce040a": {
    "sourceHash": 2618230537,
    "valueCount": 1,
    "strings": [
      "机器：",
      "。切换机器。"
    ],
    "order": [
      0
    ]
  },
  "ModelPicker.template.3fc1af0e": {
    "sourceHash": 3625739671,
    "valueCount": 17,
    "strings": [
      "\n      <modal-surface\n        .onClose=",
      "\n        .initialFocus=",
      "\n        .label=",
      "\n        @keydown=",
      "\n      >\n        <header>\n          <strong>",
      "</strong>\n          <button aria-label=\"关闭\" @click=",
      ">×</button>\n        </header>\n        <div class=\"scope-toggle\" role=\"group\" aria-label=\"模型范围\">\n          ",
      "\n          ",
      "\n        </div>\n        ",
      "\n        <div class=\"search-row\">\n          <input class=\"search\" aria-label=\"搜索模型\" placeholder=\"搜索\" .value=",
      " @input=",
      ">\n          ",
      "\n        </div>\n        ",
      "\n        <div\n          class=\"options\"\n          role=\"region\"\n          aria-label=",
      "\n          tabindex=\"0\"\n          aria-busy=",
      "\n        >\n          ",
      "\n          ",
      "\n        </div>\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16
    ]
  },
  "ModelPicker.project_override_showing_models_from_this_workspace.4a934e19": {
    "sourceHash": 4075704932,
    "valueCount": 0,
    "strings": [
      "\n          <div class=\"scope-notice\" role=\"status\">\n            <strong>项目覆盖设置</strong>\n            <span>模型来自此工作区的 <code>.pi/settings.json</code>。模型可用性选择已禁用。</span>\n          </div>\n        "
    ],
    "order": []
  },
  "ModelPicker.no_matching_options.0f4a8c1b": {
    "sourceHash": 3492662518,
    "valueCount": 0,
    "strings": [
      "<div class=\"empty\">没有匹配的选项</div>"
    ],
    "order": []
  },
  "ModelPicker.model_availability_for_is_controlled_by_workspace.c68b85eb": {
    "sourceHash": 2275323237,
    "valueCount": 1,
    "strings": [
      "",
      " 的模型可用性由工作区设置控制"
    ],
    "order": [
      0
    ]
  },
  "ModelPicker.current_model_cannot_be_deselected.788077d4": {
    "sourceHash": 1877283399,
    "valueCount": 1,
    "strings": [
      "不能取消选择当前模型 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "ModelPicker.failed_to_toggle_model.f22cdfcb": {
    "sourceHash": 3445229298,
    "valueCount": 1,
    "strings": [
      "切换模型 ",
      " 失败"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.recently_active_in_another_pi_web_instance.21af7111": {
    "sourceHash": 731134722,
    "valueCount": 1,
    "strings": [
      "\n      <section class=\"composer-activity-notice\" role=\"alert\" aria-label=\"其他实例中的近期活动\">\n        <div class=\"composer-activity-notice-text\">\n          <p>此会话近期在另一个 PI WEB 实例中活动。请避免同时在两个实例中操作此会话。</p>\n        </div>\n        <button type=\"button\" @click=",
      ">关闭提示并继续</button>\n      </section>\n    "
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.is_unavailable.3f0a2dc3": {
    "sourceHash": 3729461107,
    "valueCount": 1,
    "strings": [
      "",
      " 不可用"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.is_still_unavailable.2ecec746": {
    "sourceHash": 2413767389,
    "valueCount": 1,
    "strings": [
      "",
      " 仍不可用"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.is_still_unavailable.8d35ce76": {
    "sourceHash": 4020160459,
    "valueCount": 1,
    "strings": [
      "",
      " 仍不可用。"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.is_unavailable_reconnecting.954186fb": {
    "sourceHash": 476666541,
    "valueCount": 1,
    "strings": [
      "",
      " 不可用，正在重新连接…"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.template.2fc2fe61": {
    "sourceHash": 3774364826,
    "valueCount": 10,
    "strings": [
      "\n      <app-panel-edge-control\n        side=\"navigation\"\n        controls=\"navigation-panel\"\n        resizeLabel=\"调整导航面板宽度\"\n        expandLabel=\"展开导航面板\"\n        collapseLabel=\"折叠导航面板\"\n        .collapsed=",
      "\n        .resizable=",
      "\n        .panelWidth=",
      "\n        .minWidth=",
      "\n        .maxWidth=",
      "\n        .onToggle=",
      "\n        .onResizeStart=",
      "\n        .onResize=",
      "\n        .onResizeEnd=",
      "\n        .onReset=",
      "\n      ></app-panel-edge-control>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9
    ]
  },
  "PiWebApp.template.d6a1e3c4": {
    "sourceHash": 927300865,
    "valueCount": 10,
    "strings": [
      "\n      <app-panel-edge-control\n        side=\"workspace\"\n        controls=\"workspace-panel\"\n        resizeLabel=\"调整工作区面板宽度\"\n        expandLabel=\"展开工作区面板\"\n        collapseLabel=\"折叠工作区面板\"\n        .collapsed=",
      "\n        .resizable=",
      "\n        .panelWidth=",
      "\n        .minWidth=",
      "\n        .maxWidth=",
      "\n        .onToggle=",
      "\n        .onResizeStart=",
      "\n        .onResize=",
      "\n        .onResizeEnd=",
      "\n        .onReset=",
      "\n      ></app-panel-edge-control>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9
    ]
  },
  "PiWebApp.failed_to_preview_cleanup.d2f0d281": {
    "sourceHash": 1668118553,
    "valueCount": 1,
    "strings": [
      "清理预览失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.failed_to_run_cleanup.2b51ce10": {
    "sourceHash": 4051501390,
    "valueCount": 1,
    "strings": [
      "执行清理失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.preparing_workspace_tools_for.d5da16a7": {
    "sourceHash": 1159293416,
    "valueCount": 1,
    "strings": [
      "正在为 ",
      " 准备工作区工具。"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.does_not_have_any_available_workspaces_try.a63cac06": {
    "sourceHash": 2279127472,
    "valueCount": 1,
    "strings": [
      "",
      " 没有可用的工作区。请重新选择或重新添加此项目。"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.choose_a_workspace_in_to_use_its.7833709a": {
    "sourceHash": 1679014108,
    "valueCount": 1,
    "strings": [
      "选择 ",
      " 中的工作区以使用工具。"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.workspace_panel_unavailable.df821270": {
    "sourceHash": 2431668728,
    "valueCount": 1,
    "strings": [
      "工作区面板不可用： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.pi_web_plugins_from_require_a_matching.218d0064": {
    "sourceHash": 3242454632,
    "valueCount": 1,
    "strings": [
      "",
      " 的 PI WEB 插件需要匹配的插件生命周期能力；请更新并重启该机器上的 PI WEB"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.pi_web_plugins_from.1b86a5c3": {
    "sourceHash": 3887734646,
    "valueCount": 1,
    "strings": [
      "",
      " 的 PI WEB 插件"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.required_terminal_plugin_failed_to_load_open.0ccfac72": {
    "sourceHash": 1276388876,
    "valueCount": 1,
    "strings": [
      "必需的终端插件加载失败：",
      "。请打开设置查看恢复指引。"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.required_terminal_plugin_failed_during_browser_open.2ddb550d": {
    "sourceHash": 3375726256,
    "valueCount": 2,
    "strings": [
      "必需的终端插件在浏览器 ",
      " 阶段失败：",
      "。请打开设置查看恢复指引。"
    ],
    "order": [
      0,
      1
    ]
  },
  "PiWebApp.failed_to_load.55f5e2eb": {
    "sourceHash": 26203607,
    "valueCount": 1,
    "strings": [
      "加载 ",
      " 失败"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.failed_to_load.3bd2b4f5": {
    "sourceHash": 1507525509,
    "valueCount": 2,
    "strings": [
      "加载 ",
      " 失败： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "PiWebApp.failed_to_start_workspace_removal.c823ebc7": {
    "sourceHash": 1589384078,
    "valueCount": 1,
    "strings": [
      "启动工作区移除失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.workspace_removal_failed.3b51ad25": {
    "sourceHash": 3009606817,
    "valueCount": 1,
    "strings": [
      "工作区移除失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.failed_to_start_workspace_removal.34d2279c": {
    "sourceHash": 1589384078,
    "valueCount": 1,
    "strings": [
      "启动工作区移除失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.workspace_removal_succeeded_but_refreshing_the_workspac.8f540a64": {
    "sourceHash": 2283989306,
    "valueCount": 1,
    "strings": [
      "工作区已移除，但刷新工作区列表失败：",
      "。正在重试…"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.remove_this_only_removes_it_from_this.a75d42ca": {
    "sourceHash": 942855099,
    "valueCount": 1,
    "strings": [
      "移除 ",
      "？\n\n这只会将其从此 PI WEB 网关中移除。"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.action_failed.6ea86288": {
    "sourceHash": 2625312274,
    "valueCount": 1,
    "strings": [
      "操作失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.action_failed.17a92ea9": {
    "sourceHash": 2625312274,
    "valueCount": 1,
    "strings": [
      "操作失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.unread.f171c6dc": {
    "sourceHash": 4278598530,
    "valueCount": 1,
    "strings": [
      "",
      " 条未读"
    ],
    "order": [
      0
    ]
  },
  "PiWebApp.unknown_view.36e6e4bd": {
    "sourceHash": 3394638935,
    "valueCount": 1,
    "strings": [
      "<div class=\"error warning\" role=\"alert\"><span class=\"error-text\">未知视图：",
      "</span></div>"
    ],
    "order": [
      0
    ]
  },
  "ProjectDialog.trust_this_project_trusting_lets_pi_load.06efff24": {
    "sourceHash": 2315447999,
    "valueCount": 4,
    "strings": [
      "\n      <label class=\"check\">\n        <input type=\"checkbox\" .checked=",
      " ?disabled=",
      " @change=",
      " />\n        <span>信任此项目</span>\n      </label>\n      <small class=\"trust-hint\">\n        信任后，Pi 可以加载此项目的 .pi 设置、扩展、技能和软件包。\n        <a href=\"https://pi.dev/docs/latest/security\" target=\"_blank\" rel=\"noreferrer\">了解项目信任</a>\n      </small>\n      ",
      "\n    "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "ProjectDialog.trust_state_unavailable.e2320232": {
    "sourceHash": 1407327133,
    "valueCount": 1,
    "strings": [
      "<small class=\"trust-error\">无法获取信任状态： ",
      "</small>"
    ],
    "order": [
      0
    ]
  },
  "ProjectDialog.add_project_project_folder_create_the_folder.059a9ba1": {
    "sourceHash": 3105712372,
    "valueCount": 16,
    "strings": [
      "\n      <modal-surface\n        .onClose=",
      "\n        .initialFocus=",
      "\n        .label=",
      "\n        @keydown=",
      "\n      >\n        <header>\n          <strong>添加项目</strong>\n          <button @click=",
      " aria-label=\"关闭\">×</button>\n        </header>\n        <div class=\"body\">\n          <label>\n            项目文件夹\n            <input .value=",
      " @input=",
      " placeholder=\"/path/to/project 或 ~/code/project\" />\n          </label>\n          <div class=\"suggestions\">\n            ",
      "\n            ",
      "\n            ",
      "\n          </div>\n          <label class=\"check\">\n            <input type=\"checkbox\" .checked=",
      " @change=",
      " />\n            文件夹不存在时创建\n          </label>\n          ",
      "\n        </div>\n        <footer>\n          <button @click=",
      ">取消</button>\n          <button class=\"primary\" ?disabled=",
      " @click=",
      ">添加项目</button>\n        </footer>\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ]
  },
  "ProjectDialog.loading_folders.74f367df": {
    "sourceHash": 1637556033,
    "valueCount": 0,
    "strings": [
      "<div class=\"hint\">正在加载文件夹…</div>"
    ],
    "order": []
  },
  "ProjectDialog.no_matching_folders_enter_a_new_path.ebaedc30": {
    "sourceHash": 366696771,
    "valueCount": 0,
    "strings": [
      "<div class=\"hint\">没有匹配的文件夹。输入新路径即可创建。</div>"
    ],
    "order": []
  },
  "ProjectList.template.3f8eed18": {
    "sourceHash": 2344960864,
    "valueCount": 13,
    "strings": [
      "\n              <div\n                class=",
      "\n                tabindex=\"0\"\n                data-project-id=",
      "\n                @focusin=",
      "\n                @focusout=",
      "\n                title=",
      "\n                @click=",
      "\n                @keydown=",
      "\n              >\n                <div class=\"action-main\">\n                  <span class=\"workspace-primary\"><span class=\"workspace-primary-label\">",
      "</span></span><small>",
      "</small>\n                  ",
      "\n                </div>\n                <div class=\"action-menu\">\n                  <button class=\"action-menu-toggle\" title=\"项目操作\" aria-label=",
      " @click=",
      ">⋯</button>\n                  ",
      "\n                </div>\n              </div>\n            "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12
    ]
  },
  "ProjectList.actions_for.a80f0aa3": {
    "sourceHash": 1417897721,
    "valueCount": 1,
    "strings": [
      "",
      " 的操作"
    ],
    "order": [
      0
    ]
  },
  "ProjectList.close.9291ad4b": {
    "sourceHash": 2079325393,
    "valueCount": 4,
    "strings": [
      "\n                    <div class=\"action-menu-panel\" style=",
      " @click=",
      ">\n                      ",
      "\n                      <button title=\"关闭项目\" @click=",
      ">关闭</button>\n                    </div>\n                  "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "ProjectList.move_up_move_down.4d3d29db": {
    "sourceHash": 592974528,
    "valueCount": 4,
    "strings": [
      "\n                        <button data-move ?disabled=",
      " @click=",
      ">上移</button>\n                        <button data-move ?disabled=",
      " @click=",
      ">下移</button>\n                      "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "ProjectList.projects.60d23590": {
    "sourceHash": 4116293968,
    "valueCount": 0,
    "strings": [
      "<span>项目</span>"
    ],
    "order": []
  },
  "ProjectList.projects.fd9190cd": {
    "sourceHash": 3696247832,
    "valueCount": 5,
    "strings": [
      "<button class=\"section-toggle\" aria-expanded=",
      " @click=",
      "><span class=\"section-title\"><span class=\"section-name\">",
      " 项目</span>",
      "</span><small class=\"section-count\">",
      "</small></button>"
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "ProjectList.close_this_only_removes_it_from_pi.32531eeb": {
    "sourceHash": 2031679932,
    "valueCount": 1,
    "strings": [
      "关闭 ",
      "？\n\n这只会将其从 PI WEB 中移除，不会更改项目文件夹。"
    ],
    "order": [
      0
    ]
  },
  "PromptEditor.template.be441e6c": {
    "sourceHash": 1374473275,
    "valueCount": 35,
    "strings": [
      "\n      <footer class=",
      " aria-busy=",
      " @paste=",
      " @dragover=",
      " @drop=",
      ">\n        ",
      "\n        <div class=\"editor-wrap\">\n          <div class=\"editor-row\">\n          <div class=\"editor-input\">\n            <div class=",
      " aria-label=\"给 Pi 发消息\" aria-disabled=",
      "></div>\n            <input class=\"attachment-input\" type=\"file\" multiple hidden @change=",
      " />\n            ",
      "\n          </div>\n          <div class=\"composer-buttons\">\n            <button class=\"icon-button composer-action send-button ",
      " ",
      "\" ?disabled=",
      " title=",
      " aria-label=",
      " @click=",
      ">",
      "<span class=\"composer-action-label\">",
      "</span></button>\n            ",
      "\n            <button class=\"icon-button composer-action stop-button\" ?hidden=",
      " ?disabled=",
      " title=",
      " aria-label=\"停止当前任务\" @click=",
      ">",
      "<span class=\"composer-action-label\">",
      "</span></button>\n          </div>\n          </div>\n          ",
      "\n          ",
      "\n          <autocomplete-menu .items=",
      " .selectedIndex=",
      " .onPick=",
      "></autocomplete-menu>\n        </div>\n        <div class=\"actions\">\n          <button class=\"editor-attach icon-button\" ?disabled=",
      " title=\"添加附件\" aria-label=\"添加附件\" @click=",
      "><span class=\"attach-mark\" aria-hidden=\"true\">+</span></button>\n          <div class=\"composer-controls\">\n            ",
      "\n            <slot name=\"status\"></slot>\n          </div>\n        </div>\n        ",
      "\n      </footer>\n      ",
      "\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34
    ]
  },
  "PromptEditor.shell_command.f0a1fde8": {
    "sourceHash": 3092736355,
    "valueCount": 1,
    "strings": [
      "<div class=\"mode-hint\">Shell 命令",
      "</div>"
    ],
    "order": [
      0
    ]
  },
  "PromptEditor.compacting_history_message_will_be_queued.a54a4ada": {
    "sourceHash": 2745803865,
    "valueCount": 0,
    "strings": [
      "<div class=\"mode-hint\">正在压缩历史 · 消息将排队</div>"
    ],
    "order": []
  },
  "PromptEditor.template.937eff61": {
    "sourceHash": 784328648,
    "valueCount": 5,
    "strings": [
      "<button class=\"icon-button composer-action steer-button ",
      "\" ?disabled=",
      " title=\"在下一次模型调用前引导当前回复\" aria-label=\"引导当前回复\" @click=",
      ">",
      "<span class=\"composer-action-label\">",
      "</span></button>"
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "PromptEditor.template.ac92dd24": {
    "sourceHash": 3276168482,
    "valueCount": 4,
    "strings": [
      "\n      <div class=\"compact-status\" aria-label=\"会话状态\">\n        <button class=\"select-model\" type=\"button\" title=\"选择模型\" aria-haspopup=\"dialog\" @click=",
      "><span class=\"model-label\" title=",
      ">",
      "</span></button>\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "PromptEditor.thinking_level.b2571526": {
    "sourceHash": 1018245417,
    "valueCount": 1,
    "strings": [
      "思考强度： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PromptEditor.thinking_level.aa8606ef": {
    "sourceHash": 1018245417,
    "valueCount": 1,
    "strings": [
      "思考强度： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PromptEditor.template.d78f42ad": {
    "sourceHash": 241784653,
    "valueCount": 2,
    "strings": [
      "\n      <div class=\"prompt-chips\" aria-label=\"待发送的插件上下文\">\n        ",
      "\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "PromptEditor.remove.2ff51610": {
    "sourceHash": 1821224573,
    "valueCount": 1,
    "strings": [
      "移除 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PromptEditor.template.f006a493": {
    "sourceHash": 2027865013,
    "valueCount": 3,
    "strings": [
      "\n      <div class=\"attachments\" aria-label=\"待发送附件\">\n        <div class=\"attachment-items\">\n          ",
      "\n        </div>\n        ",
      "\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "PromptEditor.template.f6a5aa80": {
    "sourceHash": 370473800,
    "valueCount": 11,
    "strings": [
      "\n          <div class=\"attachment-chip attachment-card\" title=",
      ">\n            <button class=\"attachment-preview-trigger\" type=\"button\" title=",
      " aria-label=",
      " @click=",
      ">\n              <span class=\"attachment-thumbnail\" aria-hidden=\"true\">",
      "</span>\n              <span class=\"attachment-card-copy\">\n                <span class=\"attachment-card-name\">",
      "</span>\n                <span class=\"attachment-card-info\">",
      " · ",
      "</span>\n              </span>\n            </button>\n            ",
      "\n            <button type=\"button\" class=\"attachment-remove\" title=\"移除附件\" aria-label=",
      " @click=",
      ">×</button>\n          </div>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ]
  },
  "PromptEditor.remove.ee640944": {
    "sourceHash": 1821224573,
    "valueCount": 1,
    "strings": [
      "移除 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PromptEditor.attach_to_message.47fbc200": {
    "sourceHash": 3846175983,
    "valueCount": 9,
    "strings": [
      "\n          <div class=\"attachment-controls\">\n            <span class=\"attachment-count\">",
      " · ",
      "</span>\n            <label class=\"attachment-delivery\" title=",
      ">\n              <select aria-label=",
      " .value=",
      " @change=",
      ">\n                <option value=\"inline\" ?disabled=",
      ">附加到消息",
      "</option>\n                <option value=\"folder\">",
      "</option>\n              </select>\n            </label>\n          </div>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ]
  },
  "PromptEditor.message_not_submitted.85a8ed36": {
    "sourceHash": 469959490,
    "valueCount": 1,
    "strings": [
      "消息未提交： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "PromptEditor.save_to.8caeb8d9": {
    "sourceHash": 1809308283,
    "valueCount": 1,
    "strings": [
      "保存到 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SessionCleanupDialog.sessions_clean_up_sessions_preview_manual_cleanup.06a74625": {
    "sourceHash": 2177191821,
    "valueCount": 16,
    "strings": [
      "\n      <modal-surface .onClose=",
      " .label=",
      ">\n        <header>\n          <div>\n            <span class=\"eyebrow\">会话</span>\n            <h1>清理会话</h1>\n          </div>\n          <button class=\"close-button\" title=\"关闭清理\" aria-label=\"关闭清理\" @click=",
      ">×</button>\n        </header>\n        <div class=\"body\">\n          <p class=\"intro\">在归档空闲会话或永久删除旧归档会话之前，预览此机器的手动清理结果。</p>\n          ",
      "\n          ",
      "\n          ",
      "\n          ",
      "\n        </div>\n        <footer>\n          <button @click=",
      ">",
      "</button>\n          <button ?disabled=",
      " @click=",
      ">",
      "</button>\n          <button class=\"danger\" ?disabled=",
      " title=",
      " @click=",
      ">",
      "</button>\n        </footer>\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ]
  },
  "SessionCleanupDialog.archive_non_archived_sessions_idle_for_more.65b9eb9a": {
    "sourceHash": 1786997250,
    "valueCount": 13,
    "strings": [
      "\n      <fieldset ?disabled=",
      ">\n        <label class=\"toggle-row\">\n          <input type=\"checkbox\" .checked=",
      " @change=",
      ">\n          <span>归档空闲超过以下天数的未归档会话：</span>\n          <input class=\"days\" type=\"number\" min=\"0\" step=\"1\" inputmode=\"numeric\" .value=",
      " ?disabled=",
      " @input=",
      ">\n          <span>天</span>\n        </label>\n        <label class=\"toggle-row delete-row\">\n          <input type=\"checkbox\" .checked=",
      " @change=",
      ">\n          <span>删除归档超过以下天数的会话：</span>\n          <input class=\"days\" type=\"number\" min=\"0\" step=\"1\" inputmode=\"numeric\" .value=",
      " ?disabled=",
      " @input=",
      ">\n          <span>天</span>\n        </label>\n      </fieldset>\n      <p class=\"warning\"><strong>删除后无法恢复。</strong> 清理只会删除已归档的会话。</p>\n      ",
      "\n      ",
      "\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12
    ]
  },
  "SessionCleanupDialog.thresholds_changed_preview_again_before_running_cleanup.beba1c04": {
    "sourceHash": 3846833763,
    "valueCount": 0,
    "strings": [
      "<div class=\"hint\" role=\"status\">阈值已更改。执行清理前请重新预览。</div>"
    ],
    "order": []
  },
  "SessionCleanupDialog.preview.583a0bba": {
    "sourceHash": 941779949,
    "valueCount": 2,
    "strings": [
      "\n      <section class=\"preview\" aria-label=\"清理预览\">\n        <h2>预览</h2>\n        ",
      "\n        ",
      "\n      </section>\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "SessionCleanupDialog.no_sessions_match_these_thresholds.6d09a1e2": {
    "sourceHash": 2516099568,
    "valueCount": 0,
    "strings": [
      "<p class=\"empty\">没有符合这些阈值的会话。</p>"
    ],
    "order": []
  },
  "SessionCleanupDialog.clean_up_project_workspace_path_archive_delete.69b41ead": {
    "sourceHash": 3736248923,
    "valueCount": 4,
    "strings": [
      "\n          ",
      "\n          <div class=\"table-scroll\" tabindex=\"0\" aria-label=\"清理项目表\">\n            <table>\n              <thead>\n                <tr><th>清理</th><th>项目/工作区路径</th><th>归档</th><th>删除归档会话</th></tr>\n              </thead>\n              <tbody>\n                ",
      "\n              </tbody>\n              <tfoot>\n                <tr><th colspan=\"2\">所选合计</th><td>",
      "</td><td>",
      "</td></tr>\n              </tfoot>\n            </table>\n          </div>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "SessionCleanupDialog.busy_skipped.2b5c0ac1": {
    "sourceHash": 3442302243,
    "valueCount": 2,
    "strings": [
      "<p class=\"hint\">已跳过 ",
      " 个忙碌中的会话。</p>"
    ],
    "order": [
      0
    ]
  },
  "SessionCleanupDialog.of_projects_selected_select_all_deselect_all.3efcdf6d": {
    "sourceHash": 3386240478,
    "valueCount": 7,
    "strings": [
      "\n      <div class=\"selection-controls\" role=\"group\" aria-label=\"项目选择\">\n        <span>",
      " of ",
      " projects selected</span>\n        <button ?disabled=",
      " @click=",
      ">全选</button>\n        <button ?disabled=",
      " @click=",
      ">取消全选</button>\n      </div>\n      ",
      "\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ]
  },
  "SessionCleanupDialog.select_at_least_one_project_to_run.2b4ceacb": {
    "sourceHash": 3428296640,
    "valueCount": 0,
    "strings": [
      "<p class=\"hint\" role=\"status\">请至少选择一个项目以执行清理。</p>"
    ],
    "order": []
  },
  "SessionCleanupDialog.clean_up.1eda4c66": {
    "sourceHash": 4103896791,
    "valueCount": 1,
    "strings": [
      "清理 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SessionCleanupDialog.cleanup_complete_archived_permanently_deleted_archived.4813659d": {
    "sourceHash": 1443319556,
    "valueCount": 4,
    "strings": [
      "\n      <section class=\"result\" aria-label=\"清理结果\">\n        <h2>清理完成</h2>\n        <p>已归档 ",
      " 个会话；永久删除 ",
      " 个归档会话。</p>\n      </section>\n    "
    ],
    "order": [
      0,
      2
    ]
  },
  "SessionList.pinned.0087f9b7": {
    "sourceHash": 787361003,
    "valueCount": 0,
    "strings": [
      "<h2 class=\"subheading pin-heading\">已固定</h2>"
    ],
    "order": []
  },
  "SessionList.recent.7eb63d1a": {
    "sourceHash": 2011143440,
    "valueCount": 0,
    "strings": [
      "<h2 class=\"subheading pin-heading\">最近</h2>"
    ],
    "order": []
  },
  "SessionList.recent.48b2bb95": {
    "sourceHash": 2011143440,
    "valueCount": 0,
    "strings": [
      "<h2 class=\"subheading pin-heading\">最近</h2>"
    ],
    "order": []
  },
  "SessionList.sessions.6250d294": {
    "sourceHash": 3657262920,
    "valueCount": 4,
    "strings": [
      "\n        <h2>\n          <span class=\"plain-heading\">会话</span>\n          ",
      "\n          ",
      "\n          ",
      "\n          ",
      "\n        </h2>\n      "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "SessionList.sessions.f54dfd54": {
    "sourceHash": 4179995068,
    "valueCount": 9,
    "strings": [
      "\n      <h2>\n        <button class=\"section-toggle\" aria-expanded=",
      " @click=",
      "><span class=\"section-title\"><span class=\"section-name\">",
      " 会话</span>",
      "</span></button>\n        ",
      "\n        ",
      "\n        <small class=\"section-count\">",
      "</small>\n        ",
      "\n        ",
      "\n      </h2>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ]
  },
  "SessionList.unread.901f7442": {
    "sourceHash": 4278598530,
    "valueCount": 1,
    "strings": [
      "",
      " 条未读"
    ],
    "order": [
      0
    ]
  },
  "SessionList.clean_up.11e8938e": {
    "sourceHash": 1466650608,
    "valueCount": 1,
    "strings": [
      "<button class=\"cleanup-entry\" title=\"预览会话清理\" @click=",
      ">清理</button>"
    ],
    "order": [
      0
    ]
  },
  "SessionList.waiting_for_to_be_created.cf7401c2": {
    "sourceHash": 1156149367,
    "valueCount": 2,
    "strings": [
      "\n      <div class=\"pending-session-row starting-session\" role=\"status\" aria-live=\"polite\">\n        <div class=\"action-main\">\n          <span class=\"action-name\"><span class=\"activity-indicator sending\" aria-hidden=\"true\"></span>",
      "</span>\n          <small>等待新会话创建</small>\n        </div>\n      </div>\n    "
    ],
    "order": [
      0
    ]
  },
  "SessionList.starting_sessions.c16a059a": {
    "sourceHash": 4257463852,
    "valueCount": 1,
    "strings": [
      "正在启动 ",
      " 个会话…"
    ],
    "order": [
      0
    ]
  },
  "SessionList.archived.e84b2842": {
    "sourceHash": 1250458320,
    "valueCount": 5,
    "strings": [
      "\n      <h2 class=\"subheading\">\n        <button class=\"section-toggle\" aria-expanded=",
      " @click=",
      "><span>",
      " 已归档</span></button>\n        ",
      "\n        <small class=\"section-count\">",
      "</small>\n      </h2>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "SessionList.archive_mark_read.f1fbbd81": {
    "sourceHash": 2071428043,
    "valueCount": 5,
    "strings": [
      "\n      <div class=\"selection-toolbar\">\n        <div class=\"bulk-row selecting\">\n          ",
      "\n          <div class=\"bulk-actions\">\n            <button ?disabled=",
      " @click=",
      ">归档</button>\n            <button ?disabled=",
      " @click=",
      ">标为已读</button>\n          </div>\n        </div>\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "SessionList.delete.49d0bd73": {
    "sourceHash": 2713225096,
    "valueCount": 3,
    "strings": [
      "\n      <div class=\"selection-toolbar\">\n        <div class=\"bulk-row selecting\">\n          ",
      "\n          <div class=\"bulk-actions\">\n            <button class=\"danger\" title=\"永久删除所选归档会话\" ?disabled=",
      " @click=",
      ">删除</button>\n          </div>\n        </div>\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SessionList.select_all.5e12f397": {
    "sourceHash": 1193858674,
    "valueCount": 1,
    "strings": [
      "<button @click=",
      ">全选</button>"
    ],
    "order": [
      0
    ]
  },
  "SessionList.clear_selected.c64ace8e": {
    "sourceHash": 2555642308,
    "valueCount": 2,
    "strings": [
      "<button @click=",
      ">取消选择（",
      "）</button>"
    ],
    "order": [
      0,
      1
    ]
  },
  "SessionList.messages.e0223b51": {
    "sourceHash": 3630881846,
    "valueCount": 26,
    "strings": [
      "\n      <div\n        class=\"action-row ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      "\"\n        style=",
      "\n        tabindex=\"0\"\n        data-session-id=",
      "\n        title=",
      "\n        @focusin=",
      "\n        @focusout=",
      "\n        @click=",
      "\n        @keydown=",
      "\n      >\n        <div class=\"action-main ",
      "\">\n          ",
      "\n          <span class=\"action-name-line\"><span class=\"action-name\" dir=\"auto\" title=",
      ">",
      "",
      "</span>",
      "</span>\n          <small class=\"session-secondary\"><span class=\"session-meta\">",
      "",
      " 条消息</span>",
      "</small>\n          ",
      "\n        </div>\n        <div class=\"action-menu\">\n          <button class=\"action-menu-toggle\" title=\"会话菜单\" @click=",
      ">⋯</button>\n        </div>\n      </div>\n      ",
      "\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25
    ]
  },
  "SessionList.agent_subsessions.ad8905a8": {
    "sourceHash": 1066003138,
    "valueCount": 6,
    "strings": [
      "<button class=\"agent-subsession-toggle\" style=",
      " aria-expanded=",
      " @click=",
      ">",
      " 代理子会话（",
      "）",
      "</button>"
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5
    ]
  },
  "SessionList.restore_delete_archived_session.94c03d65": {
    "sourceHash": 3017713920,
    "valueCount": 2,
    "strings": [
      "\n            <button title=\"恢复会话\" @click=",
      ">恢复</button>\n            <button class=\"danger\" title=\"永久删除归档会话\" @click=",
      ">删除归档会话</button>\n          "
    ],
    "order": [
      0,
      1
    ]
  },
  "SessionList.delete.70d94299": {
    "sourceHash": 88758028,
    "valueCount": 1,
    "strings": [
      "<button title=\"删除临时新会话\" @click=",
      ">删除</button>"
    ],
    "order": [
      0
    ]
  },
  "SessionList.mark_as_read.204dd6db": {
    "sourceHash": 1637046076,
    "valueCount": 1,
    "strings": [
      "<button title=\"将会话标为已读\" @click=",
      ">标为已读</button>"
    ],
    "order": [
      0
    ]
  },
  "SessionList.archive.62b3dc4f": {
    "sourceHash": 3302393206,
    "valueCount": 2,
    "strings": [
      "\n                <button title=\"归档会话\" @click=",
      ">归档</button>\n                ",
      "\n              "
    ],
    "order": [
      0,
      1
    ]
  },
  "SessionList.archive_with_descendants.eefdc8bc": {
    "sourceHash": 2735156412,
    "valueCount": 2,
    "strings": [
      "<button title=\"归档此会话及其子会话\" @click=",
      ">归档及所有子会话（",
      "）</button>"
    ],
    "order": [
      0,
      1
    ]
  },
  "SessionList.detach_from_parent.82022af4": {
    "sourceHash": 932557036,
    "valueCount": 1,
    "strings": [
      "<button title=\"解除与父会话的关联\" @click=",
      ">解除与父会话的关联</button>"
    ],
    "order": [
      0
    ]
  },
  "SessionList.reload_from_disk.03ed9768": {
    "sourceHash": 2717020238,
    "valueCount": 3,
    "strings": [
      "<button title=",
      " ?disabled=",
      " @click=",
      ">从磁盘重新加载</button>"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SessionList.pin_session.4d146509": {
    "sourceHash": 2028075932,
    "valueCount": 1,
    "strings": [
      "<button @click=",
      ">固定会话</button>"
    ],
    "order": [
      0
    ]
  },
  "SessionList.unpin_session_move_up_move_down.897403c1": {
    "sourceHash": 4010139368,
    "valueCount": 5,
    "strings": [
      "\n      <button @click=",
      ">取消固定会话</button>\n      <button data-pin-move ?disabled=",
      " @click=",
      ">上移</button>\n      <button data-pin-move ?disabled=",
      " @click=",
      ">下移</button>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "SessionList.archive_and.9a904a02": {
    "sourceHash": 820862680,
    "valueCount": 3,
    "strings": [
      "归档“",
      "”及 ",
      " 个",
      "？"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SessionList.permanently_delete_archived_session_this_cannot_be.6ba1c44e": {
    "sourceHash": 352320016,
    "valueCount": 1,
    "strings": [
      "永久删除归档会话“",
      "”？此操作无法撤销。"
    ],
    "order": [
      0
    ]
  },
  "SessionList.permanently_delete_selected_this_cannot_be_undone.a90416bb": {
    "sourceHash": 4021090748,
    "valueCount": 2,
    "strings": [
      "永久删除所选的 ",
      " 个",
      "？此操作无法撤销。"
    ],
    "order": [
      0,
      1
    ]
  },
  "SessionTreeNavigator.conversation_history_navigate_session_tree.1600c2af": {
    "sourceHash": 1674257986,
    "valueCount": 9,
    "strings": [
      "\n      <modal-surface\n        .label=",
      "\n        .initialFocus=",
      "\n        ?busy=",
      "\n        .onClose=",
      "\n        .onBusyEscape=",
      "\n      >\n        <header>\n          <div>\n            <span class=\"eyebrow\">对话历史</span>\n            <h1>浏览会话树</h1>\n          </div>\n          <button class=\"close-button\" ?disabled=",
      " title=\"关闭会话树\" aria-label=\"关闭会话树\" @click=",
      ">×</button>\n        </header>\n        ",
      "\n        ",
      "\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ]
  },
  "SessionTreeNavigator.select_the_history_entry_where_you_would.fe730f36": {
    "sourceHash": 2208149724,
    "valueCount": 3,
    "strings": [
      "\n      <div class=\"body tree-step\">\n        <div class=\"tree-intro\">\n          <p>选择要从中继续的历史记录。</p>\n          <div class=\"legend\" aria-label=\"会话树标记\">\n            <span><span class=\"marker active-path-marker\" aria-hidden=\"true\"></span>当前路径</span>\n            <span><span class=\"marker active-leaf-marker\" aria-hidden=\"true\"></span>当前末端</span>\n          </div>\n        </div>\n        ",
      "\n        ",
      "\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SessionTreeNavigator.this_session_does_not_contain_any_selectable.2ee4514e": {
    "sourceHash": 2056583759,
    "valueCount": 0,
    "strings": [
      "\n          <div class=\"empty\" role=\"status\">此会话没有可选择的历史记录。</div>\n        "
    ],
    "order": []
  },
  "SessionTreeNavigator.template.b34b8530": {
    "sourceHash": 3918154926,
    "valueCount": 1,
    "strings": [
      "\n          <div class=\"tree\" role=\"tree\" aria-label=\"完整会话历史\">\n            ",
      "\n          </div>\n        "
    ],
    "order": [
      0
    ]
  },
  "SessionTreeNavigator.active_path.56b0f481": {
    "sourceHash": 359676930,
    "valueCount": 0,
    "strings": [
      "<span class=\"badge path\">当前路径</span>"
    ],
    "order": []
  },
  "SessionTreeNavigator.active_leaf.276eb6f8": {
    "sourceHash": 26029514,
    "valueCount": 0,
    "strings": [
      "<span class=\"badge leaf\">当前末端</span>"
    ],
    "order": []
  },
  "SessionTreeNavigator.selected_entry_choose_how_to_continue_how.1ca5df1e": {
    "sourceHash": 765255629,
    "valueCount": 7,
    "strings": [
      "\n      <div class=\"body confirmation-step\">\n        <div class=\"confirmation-card\">\n          <div>\n            <span class=\"eyebrow\">所选记录</span>\n            <h2>选择继续方式</h2>\n          </div>\n          ",
      "\n          <fieldset ?disabled=",
      ">\n            <legend>你想如何继续？</legend>\n            ",
      "\n            ",
      "\n          </fieldset>\n          ",
      "\n          <div class=\"side-effects-note\" role=\"note\">\n            <strong>仅限对话上下文。</strong> 继续或派生不会撤销文件系统更改、Shell 命令、工具调用或其他副作用。\n          </div>\n          ",
      "\n          ",
      "\n        </div>\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6
    ]
  },
  "SessionTreeNavigator.the_selected_history_entry_is_no_longer.f3dcdf46": {
    "sourceHash": 754296471,
    "valueCount": 0,
    "strings": [
      "<div class=\"empty\">所选历史记录已不可用。</div>"
    ],
    "order": []
  },
  "SessionTreeNavigator.abandoned_branch_summary.03856861": {
    "sourceHash": 3718559289,
    "valueCount": 5,
    "strings": [
      "\n            <fieldset ?disabled=",
      ">\n              <legend>离开分支的摘要</legend>\n              ",
      "\n              ",
      "\n              ",
      "\n              ",
      "\n            </fieldset>\n          "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "SessionTreeNavigator.custom_summary_focus.9d01576a": {
    "sourceHash": 3855123149,
    "valueCount": 6,
    "strings": [
      "\n                <label class=\"custom-focus\" for=\"session-tree-custom-focus\">\n                  <span>自定义摘要重点</span>\n                  <textarea\n                    id=\"session-tree-custom-focus\"\n                    rows=\"5\"\n                    maxlength=",
      "\n                    .value=",
      "\n                    @input=",
      "\n                  ></textarea>\n                  <span class=\"character-count\">",
      " / ",
      "</span>\n                </label>\n                ",
      "\n              "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5
    ]
  },
  "SessionTreeNavigator.cancel_next.c5fa36c3": {
    "sourceHash": 2418054054,
    "valueCount": 3,
    "strings": [
      "\n        <footer>\n          <button @click=",
      ">取消</button>\n          <span class=\"footer-spacer\"></span>\n          <button class=\"primary\" ?disabled=",
      " @click=",
      ">下一步</button>\n        </footer>\n      "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SessionTreeNavigator.back.0fca1a25": {
    "sourceHash": 2299541510,
    "valueCount": 6,
    "strings": [
      "\n      <footer>\n        <button ?disabled=",
      " @click=",
      ">返回</button>\n        <span class=\"footer-spacer\"></span>\n        ",
      "\n        <button class=\"primary\" ?disabled=",
      " @click=",
      ">\n          ",
      "\n        </button>\n      </footer>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5
    ]
  },
  "SessionTreeNavigator.could_not_navigate_session_history.c22018ee": {
    "sourceHash": 2403095110,
    "valueCount": 1,
    "strings": [
      "无法浏览会话历史： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SessionTreeNavigator.could_not_cancel_summarization.35d2879a": {
    "sourceHash": 1519637348,
    "valueCount": 1,
    "strings": [
      "无法取消总结： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.settings_pi_web.760f578b": {
    "sourceHash": 3740598926,
    "valueCount": 12,
    "strings": [
      "\n      <modal-surface .onClose=",
      " .label=",
      ">\n        <header class=\"settings-header\">\n          <div>\n            <span class=\"eyebrow\">设置</span>\n            <h1>PI WEB</h1>\n          </div>\n          <button class=\"close-button\" title=\"关闭设置\" aria-label=\"关闭设置\" @click=",
      ">×</button>\n        </header>\n        <div class=\"settings-body\">\n          <nav class=\"settings-nav\" aria-label=\"设置分类\">\n            ",
      "\n            ",
      "\n            ",
      "\n            ",
      "\n            ",
      "\n            ",
      "\n            ",
      "\n            ",
      "\n          </nav>\n          <main class=\"settings-content\">\n            ",
      "\n          </main>\n        </div>\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11
    ]
  },
  "SettingsDialog.failed_to_load_file_access_upload_config.b5ad76ea": {
    "sourceHash": 2949467999,
    "valueCount": 2,
    "strings": [
      "从 ",
      " 加载文件访问/上传配置失败： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsDialog.failed_to_load_session_daemon_config_from.ae288701": {
    "sourceHash": 3677931326,
    "valueCount": 2,
    "strings": [
      "从 ",
      " 加载会话守护进程配置失败： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsDialog.plugin_lifecycle_diagnostics_are_not_available_on.cf9cd176": {
    "sourceHash": 4221471139,
    "valueCount": 1,
    "strings": [
      "",
      " 不支持插件生命周期诊断。"
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.failed_to_load_pi_web_plugin_config.cc48ef42": {
    "sourceHash": 1389819314,
    "valueCount": 3,
    "strings": [
      "从 ",
      " 加载 PI WEB 插件配置失败： ",
      "; ",
      ""
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SettingsDialog.config.173e652a": {
    "sourceHash": 3089959169,
    "valueCount": 1,
    "strings": [
      "配置：",
      ""
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.pi_web_plugins.409564f1": {
    "sourceHash": 732938532,
    "valueCount": 1,
    "strings": [
      "PI WEB 插件：",
      ""
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.failed_to_load_pi_web_plugin_settings.b65c96a9": {
    "sourceHash": 874827644,
    "valueCount": 2,
    "strings": [
      "从 ",
      " 加载 PI WEB 插件设置失败：",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsDialog.plugin_config_is_not_loaded_for_reload.50cfd48f": {
    "sourceHash": 357330036,
    "valueCount": 1,
    "strings": [
      "尚未加载 ",
      " 的插件配置。更改插件启用状态前请先重新加载。"
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.plugin_lifecycle_diagnostics_are_not_available_on.53c653ea": {
    "sourceHash": 4221471139,
    "valueCount": 1,
    "strings": [
      "",
      " 不支持插件生命周期诊断。"
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.failed_to_save_pi_web_plugin_config.5e227998": {
    "sourceHash": 3643909571,
    "valueCount": 2,
    "strings": [
      "在 ",
      " 上保存 PI WEB 插件配置失败： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsDialog.failed_to_save_config.cfd6a279": {
    "sourceHash": 1869997070,
    "valueCount": 1,
    "strings": [
      "保存配置失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.failed_to_save_default_theme.2d52aa4e": {
    "sourceHash": 3717395954,
    "valueCount": 1,
    "strings": [
      "保存默认主题失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.failed_to_save_file_access_upload_config.4a64399d": {
    "sourceHash": 2773796881,
    "valueCount": 2,
    "strings": [
      "在 ",
      " 上保存文件访问/上传配置失败： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsDialog.failed_to_save_session_daemon_config_on.32c3c9dd": {
    "sourceHash": 1651336032,
    "valueCount": 2,
    "strings": [
      "在 ",
      " 上保存会话守护进程配置失败： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsDialog.failed_to_on.48f2c37f": {
    "sourceHash": 2788619698,
    "valueCount": 3,
    "strings": [
      "在 ",
      " 上",
      "失败： ",
      ""
    ],
    "order": [
      1,
      0,
      2
    ]
  },
  "SettingsDialog.failed_to_refresh_gateway_pi_web_plugins.5439f935": {
    "sourceHash": 4122910903,
    "valueCount": 1,
    "strings": [
      "刷新网关 PI WEB 插件失败： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SettingsDialog.config_saved_but_failed_to_refresh_pi.71254876": {
    "sourceHash": 267229937,
    "valueCount": 2,
    "strings": [
      "配置已保存，但从 ",
      " 刷新 PI WEB 插件失败： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "StatusBar.template.123f7e9d": {
    "sourceHash": 382381097,
    "valueCount": 2,
    "strings": [
      "",
      " 条警告"
    ],
    "order": [
      0
    ]
  },
  "StatusBar.minimise.98e2a11d": {
    "sourceHash": 3331491588,
    "valueCount": 1,
    "strings": [
      "收起",
      ""
    ],
    "order": [
      0
    ]
  },
  "StatusBar.show_in_the_warning_area.71d1978a": {
    "sourceHash": 3998542437,
    "valueCount": 1,
    "strings": [
      "在警告区域显示",
      ""
    ],
    "order": [
      0
    ]
  },
  "StatusBar.no_session_status_yet.dc472689": {
    "sourceHash": 2342833964,
    "valueCount": 0,
    "strings": [
      "<div class=\"bar muted\">暂无会话状态</div>"
    ],
    "order": []
  },
  "StatusBar.context.a2728c17": {
    "sourceHash": 1190921782,
    "valueCount": 1,
    "strings": [
      "上下文 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "StatusBar.queued.aa0b8a9a": {
    "sourceHash": 1967580857,
    "valueCount": 1,
    "strings": [
      "<span>",
      " 条排队中</span>"
    ],
    "order": [
      0
    ]
  },
  "ToolExecutionView.applied_diff_differs_from_the_preview.67520e1d": {
    "sourceHash": 4171110455,
    "valueCount": 0,
    "strings": [
      "<p class=\"notice\">实际应用的差异与预览不一致。</p>"
    ],
    "order": []
  },
  "ToolExecutionView.details.9ee206f3": {
    "sourceHash": 1536046674,
    "valueCount": 3,
    "strings": [
      "\n      <details class=\"text-body\" ?open=",
      ">\n        <summary>输入与结果</summary>\n        ",
      "\n        ",
      "\n      </details>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "ToolExecutionView.result.5f8bc2b0": {
    "sourceHash": 101792121,
    "valueCount": 3,
    "strings": [
      "\n          <div class=\"detail-result\">\n            <span class=\"detail-label\">结果</span>\n            <button type=\"button\" @click=",
      ">",
      "</button>\n            <pre>",
      "</pre>\n          </div>\n        "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "ToolExecutionView.showing_of_lines.25201e9f": {
    "sourceHash": 30833050,
    "valueCount": 2,
    "strings": [
      "显示 ",
      " 行，共 ",
      " 行"
    ],
    "order": [
      0,
      1
    ]
  },
  "ToolExecutionView.edit.b20676b2": {
    "sourceHash": 3452855997,
    "valueCount": 2,
    "strings": [
      "",
      " 处编辑"
    ],
    "order": [
      0
    ]
  },
  "TranscriptImage.template.f178d411": {
    "sourceHash": 2488475490,
    "valueCount": 4,
    "strings": [
      "<pi-web-image-presentation\n      .source=",
      " .requestDisabled=",
      "\n      .dimensions=",
      "\n      .pendingLabel=",
      "\n      description=\"附加图片\" label=\"附加图片\"\n    ></pi-web-image-presentation>"
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "WorkspaceList.workspaces.0d24eed9": {
    "sourceHash": 1174537184,
    "valueCount": 0,
    "strings": [
      "<span>工作区</span>"
    ],
    "order": []
  },
  "WorkspaceList.workspaces.b7a9e786": {
    "sourceHash": 1252135392,
    "valueCount": 5,
    "strings": [
      "<button class=\"section-toggle\" aria-expanded=",
      " @click=",
      "><span class=\"section-title\"><span class=\"section-name\">",
      " 工作区</span>",
      "</span><small class=\"section-count\">",
      "</small></button>"
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "WorkspaceList.deleting.063f4525": {
    "sourceHash": 2756412899,
    "valueCount": 0,
    "strings": [
      "<span class=\"workspace-status\">正在删除…</span>"
    ],
    "order": []
  },
  "WorkspaceList.template.dd405b57": {
    "sourceHash": 2888057344,
    "valueCount": 5,
    "strings": [
      "\n      <div class=\"action-menu\">\n        <button\n          class=\"action-menu-toggle\"\n          title=\"工作区操作与详情\"\n          aria-label=",
      "\n          aria-expanded=",
      "\n          aria-controls=",
      "\n          @click=",
      "\n        >⋯</button>\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "WorkspaceList.actions_and_details_for.8fd26615": {
    "sourceHash": 840355318,
    "valueCount": 1,
    "strings": [
      "",
      " 的操作与详情"
    ],
    "order": [
      0
    ]
  },
  "WorkspaceList.move_up_move_down.853b8385": {
    "sourceHash": 2793740648,
    "valueCount": 4,
    "strings": [
      "\n          <button data-move ?disabled=",
      " @click=",
      ">上移</button>\n          <button data-move ?disabled=",
      " @click=",
      ">下移</button>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "WorkspaceList.trusted_learn_about_project_trust.d49e8c96": {
    "sourceHash": 3331454223,
    "valueCount": 9,
    "strings": [
      "\n      <div class=\"workspace-menu-trust\">\n        <label class=\"action-menu-checkbox\" for=",
      ">\n          <span>已信任",
      "</span>\n          <input\n            id=",
      "\n            type=\"checkbox\"\n            aria-describedby=",
      "\n            .checked=",
      "\n            ?disabled=",
      "\n            @change=",
      "\n          />\n        </label>\n        <div class=\"action-menu-description\" id=",
      ">\n          <a href=\"https://pi.dev/docs/latest/security\" target=\"_blank\" rel=\"noreferrer\">了解项目信任</a>\n        </div>\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8
    ]
  },
  "WorkspaceList.workspace_path.4a7a4072": {
    "sourceHash": 3098044112,
    "valueCount": 6,
    "strings": [
      "\n      <dl class=\"workspace-menu-details\">\n        <div class=\"workspace-detail-row\">\n          <dt>工作区</dt>\n          <dd>",
      "",
      "</dd>\n        </div>\n        <div class=\"workspace-detail-row\">\n          <dt>路径</dt>\n          <dd title=",
      ">",
      "",
      "</dd>\n        </div>\n        ",
      "\n      </dl>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5
    ]
  },
  "WorkspaceList.details.12a50c56": {
    "sourceHash": 1453173955,
    "valueCount": 1,
    "strings": [
      "\n          <div class=\"workspace-detail-row\">\n            <dt>详情</dt>\n            <dd><span class=\"workspace-label\">",
      "</span></dd>\n          </div>\n        "
    ],
    "order": [
      0
    ]
  },
  "WorkspacePanel.workspace_panel_unavailable.b6a37e5c": {
    "sourceHash": 2431668728,
    "valueCount": 1,
    "strings": [
      "工作区面板不可用： ",
      ""
    ],
    "order": [
      0
    ]
  },
  "WorkspacePanel.template.d62c5933": {
    "sourceHash": 200008142,
    "valueCount": 3,
    "strings": [
      "<button type=\"button\" class=",
      " title=\"导航\" aria-label=\"导航\" aria-haspopup=\"dialog\" @click=",
      ">",
      "</button>"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "AppContextBar.location_project_workspace_session.90317777": {
    "sourceHash": 3890233213,
    "valueCount": 19,
    "strings": [
      "\n      <nav class=",
      " aria-label=\"当前位置\">\n        <span class=\"context-bar-label\">位置</span>\n        <ol class=\"context-items\" @scroll=",
      ">\n          ",
      "\n          <li class=\"context-item\">\n            <button type=\"button\" class=",
      " title=",
      " aria-label=",
      " @click=",
      ">\n              <span class=\"context-kind\">项目</span>\n              <span class=\"context-value\">",
      "</span>\n            </button>\n          </li>\n          <li class=\"context-item\">\n            <button type=\"button\" class=",
      " title=",
      " aria-label=",
      " @click=",
      ">\n              <span class=\"context-kind\">工作区</span>\n              <span class=\"context-value\">",
      "</span>\n            </button>\n          </li>\n          <li class=\"context-item\">\n            <button type=\"button\" class=",
      " title=",
      " aria-label=",
      " @click=",
      ">\n              <span class=\"context-kind\">会话</span>\n              <span class=\"context-value\">",
      "</span>\n            </button>\n          </li>\n        </ol>\n        ",
      "\n      </nav>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18
    ]
  },
  "AppContextBar.machine_open_machine_selection.fc7b1a94": {
    "sourceHash": 3753656623,
    "valueCount": 1,
    "strings": [
      "机器：",
      "。打开机器选择。"
    ],
    "order": [
      0
    ]
  },
  "AppContextBar.project_open_project_selection.805aa728": {
    "sourceHash": 3100222895,
    "valueCount": 1,
    "strings": [
      "项目：",
      "。打开项目选择。"
    ],
    "order": [
      0
    ]
  },
  "AppContextBar.workspace_open_workspace_selection.1e2f44a7": {
    "sourceHash": 2893959903,
    "valueCount": 1,
    "strings": [
      "工作区：",
      "。打开工作区选择。"
    ],
    "order": [
      0
    ]
  },
  "AppContextBar.session_open_session_selection.b575725d": {
    "sourceHash": 1332322637,
    "valueCount": 1,
    "strings": [
      "会话：",
      "。打开会话选择。"
    ],
    "order": [
      0
    ]
  },
  "AppContextBar.template.29f1820d": {
    "sourceHash": 200008142,
    "valueCount": 3,
    "strings": [
      "<button type=\"button\" class=",
      " title=\"导航\" aria-label=\"导航\" aria-haspopup=\"dialog\" @click=",
      ">",
      "</button>"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "AppContextBar.no_machine.e672d7d6": {
    "sourceHash": 3566482974,
    "valueCount": 0,
    "strings": [
      "<span class=\"context-value\">无机器</span>"
    ],
    "order": []
  },
  "AppContextBar.template.f9feeffd": {
    "sourceHash": 382929393,
    "valueCount": 1,
    "strings": [
      "\n      <button type=\"button\" class=\"context-action-button\" title=\"搜索页面和命令\" aria-label=\"搜索页面和命令\" @click=",
      ">\n        <svg class=\"context-action-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\">\n          <path d=\"M13 2 4 14h7l-1 8 10-13h-7V2Z\"></path>\n        </svg>\n      </button>\n    "
    ],
    "order": [
      0
    ]
  },
  "AppMobileMainTabs.template.c9424a44": {
    "sourceHash": 200008142,
    "valueCount": 3,
    "strings": [
      "<button type=\"button\" class=",
      " title=\"导航\" aria-label=\"导航\" aria-haspopup=\"dialog\" @click=",
      ">",
      "</button>"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "AppNavigationPanel.pi_web_actions.a6cbb6f6": {
    "sourceHash": 2393678192,
    "valueCount": 52,
    "strings": [
      "\n      <header>\n        <div class=\"brand\">",
      "<strong>PI WEB</strong></div>\n        <machine-switcher\n          .machines=",
      "\n          .selected=",
      "\n          .locationIndicator=",
      "\n          .statuses=",
      "\n          .statusSnapshots=",
      "\n          .onSelect=",
      "\n          .onRemove=",
      "\n          .onFocusNextSection=",
      "\n          .onCancelKeyboardNavigation=",
      "\n        ></machine-switcher>\n        <div class=\"header-actions\">\n          ",
      "\n          ",
      "\n          <button class=\"palette-button\" title=\"搜索页面和命令\" aria-label=\"搜索页面和命令\" @click=",
      "><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"><rect x=\"4\" y=\"4\" width=\"5\" height=\"5\" rx=\"1\"></rect><rect x=\"15\" y=\"4\" width=\"5\" height=\"5\" rx=\"1\"></rect><rect x=\"4\" y=\"15\" width=\"5\" height=\"5\" rx=\"1\"></rect><rect x=\"15\" y=\"15\" width=\"5\" height=\"5\" rx=\"1\"></rect></svg>命令</button>\n        </div>\n      </header>\n      ",
      "\n      ",
      "\n      <session-list\n        .sessions=",
      "\n        .pinnedRootIds=",
      "\n        .onPin=",
      "\n        .onUnpin=",
      "\n        .onMovePin=",
      "\n        .statuses=",
      "\n        .activities=",
      "\n        .sessionFlags=",
      "\n        .sending=",
      "\n        .unreadSessionIds=",
      "\n        .selected=",
      "\n        .sessionLabelItems=",
      "\n        .startingCount=",
      "\n        .canStart=",
      "\n        .hideStartButton=",
      "\n        .collapsible=",
      "\n        .collapsed=",
      "\n        .onToggleCollapsed=",
      "\n        .onArchivedCollapsed=",
      "\n        .onStart=",
      "\n        .onSelect=",
      "\n        .onArchive=",
      "\n        .onArchiveWithDescendants=",
      "\n        .onArchiveMany=",
      "\n        .onRestore=",
      "\n        .onDelete=",
      "\n        .onDeleteArchived=",
      "\n        .onDeleteArchivedMany=",
      "\n        .onDetachParent=",
      "\n        .onMarkRead=",
      "\n        .onMarkReadMany=",
      "\n        .onReload=",
      "\n        .onCleanup=",
      "\n        .onFocusPreviousSection=",
      "\n        .onFocusNextSection=",
      "\n        .onCancelKeyboardNavigation=",
      "\n      ></session-list>\n      ",
      "\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
      32,
      33,
      34,
      35,
      36,
      37,
      38,
      39,
      40,
      41,
      42,
      43,
      44,
      45,
      46,
      47,
      48,
      49,
      50,
      51
    ]
  },
  "AppPanelEdgeControl.double_click_or_double_tap_to_reset.5f010e5a": {
    "sourceHash": 1064436365,
    "valueCount": 1,
    "strings": [
      "",
      ". 双击或连点两下以重置。"
    ],
    "order": [
      0
    ]
  },
  "NavigationDialog.navigation_pin_destinations_to_the_tab_bars.842b25d7": {
    "sourceHash": 3576335212,
    "valueCount": 15,
    "strings": [
      "\n      <modal-surface .label=",
      " .initialFocus=",
      " .onClose=",
      " @keydown=",
      ">\n        <header>\n          <input aria-label=\"搜索导航\" aria-describedby=\"navigation-selection\" placeholder=\"搜索导航…\" .value=",
      " @input=",
      ">\n          <button aria-label=\"关闭\" title=\"关闭\" @click=",
      ">×</button>\n        </header>\n        <span id=\"navigation-selection\" class=\"sr-only\" role=\"status\" aria-live=\"polite\" aria-atomic=\"true\">",
      "</span>\n        <h2>导航</h2>\n        <p>将目标固定到标签栏。取消最后一个固定后会显示所有标签页。</p>\n        <nav class=\"options\" aria-label=\"目标\">\n          ",
      "\n          ",
      "\n        </nav>\n        <footer>\n          <button @click=",
      ">显示所有标签页</button>\n          <div class=\"mobile-navigation\" role=\"group\" aria-label=\"移动端导航\">\n            <span>移动端导航</span>\n            <div class=\"toggle-options\">\n              <button type=\"button\" aria-pressed=",
      " @click=",
      ">展开</button>\n              <button type=\"button\" aria-pressed=",
      " @click=",
      ">折叠</button>\n            </div>\n          </div>\n        </footer>\n      </modal-surface>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14
    ]
  },
  "NavigationDialog.of.0e166819": {
    "sourceHash": 79700492,
    "valueCount": 3,
    "strings": [
      "",
      ", 第 ",
      " 项，共 ",
      " 项"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "NavigationDialog.no_destinations_found.afa3249e": {
    "sourceHash": 1886338450,
    "valueCount": 0,
    "strings": [
      "<div class=\"empty\">没有匹配的页面或工具。</div>"
    ],
    "order": []
  },
  "NavigationDialog.pin.e4baae6b": {
    "sourceHash": 664407554,
    "valueCount": 1,
    "strings": [
      "固定 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "NavigationDialog.unpin.55006b08": {
    "sourceHash": 3710300291,
    "valueCount": 1,
    "strings": [
      "取消固定 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "NavigationDialog.pin.9bce8597": {
    "sourceHash": 664407554,
    "valueCount": 1,
    "strings": [
      "固定 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "deprecatedAgentInputsBanner.support_for_deprecated_agent_configuration_inputs_will.790852cc": {
    "sourceHash": 2604020759,
    "valueCount": 2,
    "strings": [
      "",
      ": ",
      ". 将在未来版本中移除对已弃用代理配置项的支持。"
    ],
    "order": [
      0,
      1
    ]
  },
  "deprecatedAgentInputsBanner.config_key.6d5c5ef6": {
    "sourceHash": 1611867448,
    "valueCount": 1,
    "strings": [
      "配置项 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "deprecatedAgentInputsBanner.environment_variable.3420d727": {
    "sourceHash": 3843064626,
    "valueCount": 1,
    "strings": [
      "环境变量 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "deprecatedAgentInputsBanner.is_deprecated_and_ignored_remove_it_there.e1119f96": {
    "sourceHash": 2875745050,
    "valueCount": 1,
    "strings": [
      "",
      " 已弃用且被忽略；请移除，没有替代项"
    ],
    "order": [
      0
    ]
  },
  "deprecatedAgentInputsBanner.is_deprecated_set_instead.6cceff97": {
    "sourceHash": 1814469085,
    "valueCount": 2,
    "strings": [
      "",
      " 已弃用；请改为设置 ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "errorBanner.dismiss.ca566a5f": {
    "sourceHash": 4041459881,
    "valueCount": 1,
    "strings": [
      "关闭",
      ""
    ],
    "order": [
      0
    ]
  },
  "errorBanner.retry.1a58dfe6": {
    "sourceHash": 2261583744,
    "valueCount": 1,
    "strings": [
      "<button type=\"button\" class=\"error-retry\" @click=",
      ">重试</button>"
    ],
    "order": [
      0
    ]
  },
  "SettingsGeneralPanel.gateway_server_fields_edit_this_local_gateway.e5df6574": {
    "sourceHash": 1114614056,
    "valueCount": 1,
    "strings": [
      "网关服务器字段用于编辑此本地网关。文件访问及上传默认设置用于编辑 ",
      "。"
    ],
    "order": [
      0
    ]
  },
  "SettingsGeneralPanel.template.559216e4": {
    "sourceHash": 3475011040,
    "valueCount": 6,
    "strings": [
      "\n      <settings-panel-frame\n        heading=\"常规配置\"\n        .description=",
      "\n        actionLabel=\"重新加载\"\n        .actionDisabled=",
      "\n        .notices=",
      "\n        .onAction=",
      "\n      >\n        <div class=\"settings-sections\">\n          <slot name=\"appearance\"></slot>\n          ",
      "\n          ",
      "\n        </div>\n      </settings-panel-frame>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5
    ]
  },
  "SettingsGeneralPanel.gateway_server_host_port_and_allowed_hosts.a02de7b8": {
    "sourceHash": 2458646422,
    "valueCount": 1,
    "strings": [
      "\n      <section class=\"settings-card\" aria-label=\"网关服务器设置\">\n        <div class=\"card-heading\">\n          <h3>网关服务器</h3>\n          <p>主机地址、端口及允许的主机保存在网关配置中。更改地址后需要重启 Web 服务，运行中的服务器才会绑定新地址。</p>\n        </div>\n        ",
      "\n      </section>\n    "
    ],
    "order": [
      0
    ]
  },
  "SettingsGeneralPanel.loading_gateway_configuration.a9c580f4": {
    "sourceHash": 1005770410,
    "valueCount": 0,
    "strings": [
      "<div class=\"loading-card\">正在加载网关配置…</div>"
    ],
    "order": []
  },
  "SettingsGeneralPanel.gateway_config_file_host_address_the_web.121b3ef5": {
    "sourceHash": 3780112671,
    "valueCount": 18,
    "strings": [
      "\n          <div class=\"config-path-card\">\n            <span>网关配置文件</span>\n            <code>",
      "</code>\n            <small>",
      "</small>\n          </div>\n          <form class=\"config-form\" @submit=",
      ">\n            <label class=\"field\">\n              <span class=\"field-heading\">\n                <span>主机地址</span>\n                ",
      "\n              </span>\n              <input .value=",
      " placeholder=\"127.0.0.1\" autocomplete=\"off\" spellcheck=\"false\" @input=",
      ">\n              <small>Web 服务器应绑定的地址。留空使用 PI WEB 默认值。</small>\n            </label>\n\n            <label class=\"field\">\n              <span class=\"field-heading\">\n                <span>端口</span>\n                ",
      "\n              </span>\n              <input .value=",
      " inputmode=\"numeric\" pattern=\"[0-9]*\" placeholder=\"8504\" autocomplete=\"off\" @input=",
      ">\n              <small>TCP 端口，范围为 1 到 65535。留空使用 PI WEB 默认值。</small>\n            </label>\n\n            <div class=\"field\">\n              <span class=\"field-heading\">\n                <span>允许的主机</span>\n                ",
      "\n              </span>\n              <select .value=",
      " @change=",
      ">\n                <option value=\"list\">仅允许列表中的主机</option>\n                <option value=\"all\">允许所有主机</option>\n              </select>\n              <textarea .value=",
      " ?disabled=",
      " rows=\"4\" placeholder=\"example.local&#10;192.168.1.20\" spellcheck=\"false\" @input=",
      "></textarea>\n              <small>每行输入一个主机，或选择“允许所有主机”以写入 <code>true</code>。</small>\n            </div>\n\n            ",
      "\n\n            <footer class=\"form-actions\">\n              <button class=\"primary\" ?disabled=",
      ">",
      "</button>\n            </footer>\n          </form>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17
    ]
  },
  "SettingsGeneralPanel.selected_machine_file_access_and_uploads_external.7472e2ab": {
    "sourceHash": 3100064208,
    "valueCount": 3,
    "strings": [
      "\n      <section class=\"settings-card\" aria-label=\"所选机器的文件访问及上传设置\">\n        <div class=\"card-heading\">\n          <h3>所选机器的文件访问及上传</h3>\n          <p>外部文件系统根目录及上传默认设置保存在 ",
      " 上。</p>\n        </div>\n        ",
      "\n        ",
      "\n      </section>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SettingsGeneralPanel.selected_machine_config_file_external_filesystem_roots.57f2e810": {
    "sourceHash": 394927645,
    "valueCount": 19,
    "strings": [
      "\n          <div class=\"config-path-card\">\n            <span>所选机器的配置文件</span>\n            <code>",
      "</code>\n            <small>",
      "</small>\n          </div>\n          <form class=\"config-form\" @submit=",
      ">\n            <label class=\"field\">\n              <span class=\"field-heading\">\n                <span>外部文件系统根目录</span>\n              </span>\n              <textarea .value=",
      " rows=\"4\" placeholder=\"~/SDKs&#10;/opt/reference\" spellcheck=\"false\" @input=",
      "></textarea>\n              <small>允许在 ",
      " 的工作区外进行绝对路径 <code>@</code> 补全和文件浏览器读取的白名单。每行输入一个绝对路径、Windows 绝对路径或以 <code>~</code> 开头的路径。留空时默认拒绝访问外部路径。</small>\n            </label>\n\n            <label class=\"field\">\n              <span class=\"field-heading\">\n                <span>默认上传文件夹</span>\n              </span>\n              <input .value=",
      " placeholder=",
      " autocomplete=\"off\" spellcheck=\"false\" @input=",
      ">\n              <small>",
      " 上手动上传文件所用的工作区相对文件夹。留空使用 PI WEB 默认值 <code>",
      "</code>。</small>\n            </label>\n\n            <label class=\"field\">\n              <span class=\"field-heading\">\n                <span>默认附件文件夹</span>\n              </span>\n              <input .value=",
      " placeholder=",
      " autocomplete=\"off\" spellcheck=\"false\" @input=",
      ">\n              <small>",
      " 上将提示词附件保存到工作区时所用的工作区相对文件夹。留空使用 PI WEB 默认值 <code>",
      "</code>。</small>\n            </label>\n\n            ",
      "\n\n            <footer class=\"form-actions\">\n              <button class=\"primary\" ?disabled=",
      ">",
      "</button>\n            </footer>\n          </form>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18
    ]
  },
  "SettingsGeneralPanel.environment_override.3e11246f": {
    "sourceHash": 3757151350,
    "valueCount": 0,
    "strings": [
      "<span class=\"override-badge\">环境变量覆盖</span>"
    ],
    "order": []
  },
  "SettingsGeneralPanel.effective_gateway_settings_after_environment_overrides_.3ab30f3a": {
    "sourceHash": 142690754,
    "valueCount": 3,
    "strings": [
      "\n      <section class=\"effective-card\" aria-label=\"实际生效的网关配置摘要\">\n        <h3>应用环境变量覆盖后实际生效的网关设置</h3>\n        <dl>\n          <div><dt>主机地址</dt><dd>",
      "</dd></div>\n          <div><dt>端口</dt><dd>",
      "</dd></div>\n          <div><dt>允许的主机</dt><dd>",
      "</dd></div>\n        </dl>\n      </section>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SettingsGeneralPanel.default.f3cfac0c": {
    "sourceHash": 2187722352,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">127.0.0.1（默认）</span>"
    ],
    "order": []
  },
  "SettingsGeneralPanel.default.142f3482": {
    "sourceHash": 3350402970,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">8504（默认）</span>"
    ],
    "order": []
  },
  "SettingsGeneralPanel.effective_selected_machine_settings_external_roots_uplo.36130e7a": {
    "sourceHash": 3152667440,
    "valueCount": 3,
    "strings": [
      "\n      <section class=\"effective-card\" aria-label=\"所选机器实际生效的文件访问及上传摘要\">\n        <h3>所选机器实际生效的设置</h3>\n        <dl>\n          <div><dt>外部根目录</dt><dd>",
      "</dd></div>\n          <div><dt>上传文件夹</dt><dd>",
      "</dd></div>\n          <div><dt>附件文件夹</dt><dd>",
      "</dd></div>\n        </dl>\n      </section>\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SettingsGeneralPanel.default.8f219ece": {
    "sourceHash": 3349063291,
    "valueCount": 1,
    "strings": [
      "<span class=\"muted\">",
      "（默认）</span>"
    ],
    "order": [
      0
    ]
  },
  "SettingsGeneralPanel.default.fca107f1": {
    "sourceHash": 3349063291,
    "valueCount": 1,
    "strings": [
      "<span class=\"muted\">",
      "（默认）</span>"
    ],
    "order": [
      0
    ]
  },
  "SettingsGeneralPanel.none_listed.d3249ccc": {
    "sourceHash": 2751852893,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">列表为空</span>"
    ],
    "order": []
  },
  "SettingsGeneralPanel.unset.dfc13475": {
    "sourceHash": 958311027,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">未设置</span>"
    ],
    "order": []
  },
  "SettingsGeneralPanel.external_paths_denied.1d220948": {
    "sourceHash": 4037705342,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">禁止访问外部路径</span>"
    ],
    "order": []
  },
  "SettingsPackagesPanel.template.9fa20443": {
    "sourceHash": 3144482526,
    "valueCount": 6,
    "strings": [
      "\n      <settings-panel-frame\n        heading=\"Pi 包\"\n        .description=",
      "\n        actionLabel=\"重新加载\"\n        actionTitle=",
      "\n        .actionDisabled=",
      "\n        .notices=",
      "\n        .onAction=",
      "\n      >\n        ",
      "\n      </settings-panel-frame>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5
    ]
  },
  "SettingsPackagesPanel.reload_pi_packages_from.7b3b31a4": {
    "sourceHash": 1339869150,
    "valueCount": 1,
    "strings": [
      "从 ",
      " 重新加载 Pi 包"
    ],
    "order": [
      0
    ]
  },
  "SettingsPackagesPanel.trusted_code_warning_pi_packages_and_pi.5710492b": {
    "sourceHash": 2774935162,
    "valueCount": 0,
    "strings": [
      "<strong>可信代码警告：</strong> Pi 包和 PI WEB 插件可以使用您的用户权限运行。请仅安装和启用来自可信来源的包与插件。"
    ],
    "order": []
  },
  "SettingsPackagesPanel.loading_pi_packages_from.04424eb4": {
    "sourceHash": 1058857931,
    "valueCount": 1,
    "strings": [
      "正在从 ",
      " 加载 Pi 包…"
    ],
    "order": [
      0
    ]
  },
  "SettingsPackagesPanel.pi_package_list_unavailable_for_use_reload.6bf36a30": {
    "sourceHash": 2558991181,
    "valueCount": 1,
    "strings": [
      "",
      " 的 Pi 包列表不可用。请点击“重新加载”后重试。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPackagesPanel.available_packages_pi_web_ships_these_packages.e3e311f2": {
    "sourceHash": 1945995451,
    "valueCount": 2,
    "strings": [
      "\n      <section class=\"known-package-section\" aria-label=\"可安装的已知 Pi 包\">\n        <h3>可安装的包</h3>\n        <p>PI WEB 随附这些包，可一键安装到 ",
      "，无需输入路径；之前移除的包也可重新安装。</p>\n        <div class=\"known-package-list\">\n          ",
      "\n        </div>\n      </section>\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsPackagesPanel.install.5095b1dd": {
    "sourceHash": 3100210646,
    "valueCount": 1,
    "strings": [
      "安装 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SettingsPackagesPanel.pi_package_source_installs_run_on_and.21dfd425": {
    "sourceHash": 1014639649,
    "valueCount": 8,
    "strings": [
      "\n      <form class=\"install-card\" @submit=",
      ">\n        <label for=\"package-source\">Pi 包来源</label>\n        <div class=\"install-row\">\n          <input id=\"package-source\" .value=",
      " ?disabled=",
      " placeholder=\"npm:@scope/package、Git URL 或本地路径\" @input=",
      ">\n          <button type=\"submit\" title=\"安装此 Pi 包\" ?disabled=",
      ">",
      "</button>\n        </div>\n        ",
      "\n        <small>安装在 ",
      " 上执行，使用 Pi 默认包位置，等同于 <code>pi install &lt;source&gt;</code>。PI WEB 无需您选择安装位置。</small>\n      </form>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7
    ]
  },
  "SettingsPackagesPanel.configured_pi_packages_this_list_comes_from.4b7eab35": {
    "sourceHash": 1307310762,
    "valueCount": 8,
    "strings": [
      "\n      <section class=\"package-section\" aria-label=\"已配置的 Pi 包\">\n        <div class=\"package-toolbar\">\n          <div>\n            <h3>已配置的 Pi 包</h3>\n            <p>此列表来自 ",
      " 上 Pi 的包管理器设置。</p>\n          </div>\n          <button class=\"secondary\" title=",
      " ?disabled=",
      " @click=",
      ">\n            ",
      "\n          </button>\n        </div>\n        ",
      "\n        ",
      "\n        ",
      "\n      </section>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7
    ]
  },
  "SettingsPackagesPanel.refreshing_pi_packages_from.f1f7229f": {
    "sourceHash": 3768913127,
    "valueCount": 1,
    "strings": [
      "<div class=\"action-note\">正在刷新 ",
      " 的 Pi 包…</div>"
    ],
    "order": [
      0
    ]
  },
  "SettingsPackagesPanel.loading_pi_packages_from.00c247b0": {
    "sourceHash": 2732771256,
    "valueCount": 1,
    "strings": [
      "<div class=\"loading-card\">正在从 ",
      " 加载 Pi 包…</div>"
    ],
    "order": [
      0
    ]
  },
  "SettingsPackagesPanel.no_pi_packages_configured_in_pi_settings.eccbe322": {
    "sourceHash": 4135363843,
    "valueCount": 1,
    "strings": [
      "<div class=\"loading-card\">",
      " 的 Pi 设置中尚未配置 Pi 包。</div>"
    ],
    "order": [
      0
    ]
  },
  "SettingsPackagesPanel.installed_path.ded8fe20": {
    "sourceHash": 347385991,
    "valueCount": 13,
    "strings": [
      "\n      <article class=",
      ">\n        <div class=\"package-main\">\n          <strong>",
      "</strong>\n          <small>",
      " · ",
      "</small>\n          <small>安装路径： <code>",
      "</code></small>\n          ",
      "\n        </div>\n        <div class=\"package-actions\">\n          <button class=\"secondary\" title=",
      " ?disabled=",
      " @click=",
      ">",
      "</button>\n          <button class=\"danger\" title=\"移除此 Pi 包\" ?disabled=",
      " @click=",
      ">",
      "</button>\n        </div>\n      </article>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12
    ]
  },
  "SettingsPackagesPanel.managing_pi_packages_on_install_remove_and.b5f79914": {
    "sourceHash": 2572868520,
    "valueCount": 1,
    "strings": [
      "管理 <strong>",
      "</strong> 上的 Pi 包。安装、移除和更新所选机器上由 Pi 管理的包。Pi 包可提供扩展、技能、提示词模板、主题、上下文/系统提示词文件及 PI WEB 浏览器插件。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPanelFrame.template.57f44c9e": {
    "sourceHash": 1625287887,
    "valueCount": 1,
    "strings": [
      "\n      <div class=\"notice-stack\" aria-label=\"设置提示\">\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.template.1bd39169": {
    "sourceHash": 3562584957,
    "valueCount": 6,
    "strings": [
      "\n      <settings-panel-frame\n        heading=\"PI WEB 插件\"\n        .description=",
      "\n        actionLabel=\"重新加载\"\n        actionTitle=",
      "\n        .actionDisabled=",
      "\n        .notices=",
      "\n        .onAction=",
      "\n      >\n        ",
      "\n      </settings-panel-frame>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5
    ]
  },
  "SettingsPluginsPanel.reload_pi_web_plugins_from.84fccec3": {
    "sourceHash": 3519741327,
    "valueCount": 1,
    "strings": [
      "从 ",
      " 重新加载 PI WEB 插件"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.desired_config_remains_editable_but_pi_web.fa683815": {
    "sourceHash": 375865151,
    "valueCount": 1,
    "strings": [
      "仍可编辑预期配置，但 PI WEB 无法验证 sessiond 快照。 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.update_and_restart_both_components_before_loading.f849e683": {
    "sourceHash": 1311872464,
    "valueCount": 1,
    "strings": [
      "",
      " 加载依赖服务端的浏览器插件前，请更新并重启这两个组件。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.only_bundled_server_plugins_were_imported_clear.afb7f9e0": {
    "sourceHash": 4247164685,
    "valueCount": 1,
    "strings": [
      "仅导入了内置服务端插件。运行 <code>",
      "</code> 可清除安全模式。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.no_server_plugins_were_imported_terminal_is.fec84120": {
    "sourceHash": 2259561899,
    "valueCount": 1,
    "strings": [
      "未导入任何服务端插件；终端不可用，内核文件夹工作区仍可用于诊断。运行 <code>",
      "</code> 可清除安全模式。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.offline_config_requests_safe_start_it_takes.b095a6fb": {
    "sourceHash": 2127550862,
    "valueCount": 1,
    "strings": [
      "离线配置已请求“",
      "”安全启动。此设置会在下次 sessiond 重启时、导入插件之前生效。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.trusted_code_warning_pi_web_plugins_and.d623b69a": {
    "sourceHash": 738404633,
    "valueCount": 0,
    "strings": [
      "<strong>可信代码警告：</strong> PI WEB 插件和 Pi 包可以使用您的用户权限运行。请仅启用来自可信来源的插件。"
    ],
    "order": []
  },
  "SettingsPluginsPanel.restart_the_session_daemon_to_apply_server.344d2294": {
    "sourceHash": 2868738393,
    "valueCount": 1,
    "strings": [
      "",
      " 重启会话守护进程以应用服务端插件更改；仅涉及浏览器的更改会在重新加载此标签页后生效。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.reload_the_browser_tab_to_apply_browser.88cc67a7": {
    "sourceHash": 1329568678,
    "valueCount": 1,
    "strings": [
      "",
      " 重新加载浏览器标签页以应用仅涉及浏览器的插件更改。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.pi_web_plugin_list_unavailable_for_use.316fb92c": {
    "sourceHash": 3244183352,
    "valueCount": 1,
    "strings": [
      "",
      " 的 PI WEB 插件列表不可用。请点击“重新加载”后重试。"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.no_pi_web_plugins_are_discovered_or.8c52e9e7": {
    "sourceHash": 1747457116,
    "valueCount": 2,
    "strings": [
      "\n        <div class=\"loading-card\">",
      " 上未发现任何 PI WEB 插件，也没有正在运行的插件。</div>\n        ",
      "\n      "
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsPluginsPanel.config_key_on_plugins_browser_only_changes.72f081f5": {
    "sourceHash": 3637691023,
    "valueCount": 3,
    "strings": [
      "\n      <div class=\"plugin-note\">",
      " 上的配置键：<code>plugins</code>。仅涉及浏览器的更改会在重新加载标签页后生效；涉及服务端的更改遵循 sessiond 的启动快照，可能需要手动重启。</div>\n      <div class=\"plugin-list\">\n        ",
      "\n      </div>\n      ",
      "\n    "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "SettingsPluginsPanel.health.73907ae8": {
    "sourceHash": 2696840388,
    "valueCount": 1,
    "strings": [
      "<small class=\"diagnostic\">健康状态：",
      "</small>"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.offline_disable.a4a00e47": {
    "sourceHash": 1927952540,
    "valueCount": 1,
    "strings": [
      "<small class=\"command\">离线禁用：<code>",
      "</code></small>"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.plugin_states.87101fec": {
    "sourceHash": 1622830718,
    "valueCount": 1,
    "strings": [
      "",
      " 插件状态"
    ],
    "order": [
      0
    ]
  },
  "SettingsPluginsPanel.conflict.87ff0f61": {
    "sourceHash": 3900466503,
    "valueCount": 0,
    "strings": [
      "<span class=\"status error\">冲突</span>"
    ],
    "order": []
  },
  "SettingsPluginsPanel.stale_revision.9dabd467": {
    "sourceHash": 3524586305,
    "valueCount": 0,
    "strings": [
      "<span class=\"status warning\">版本已过期</span>"
    ],
    "order": []
  },
  "SettingsPluginsPanel.restart_required.9d3aad82": {
    "sourceHash": 3333355507,
    "valueCount": 0,
    "strings": [
      "<span class=\"status warning\">需要重启</span>"
    ],
    "order": []
  },
  "SettingsPluginsPanel.health.6f222265": {
    "sourceHash": 3041898317,
    "valueCount": 2,
    "strings": [
      "<span class=",
      ">健康状态：",
      "</span>"
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsPluginsPanel.offline_recovery_on_these_commands_edit_config.b7f2fef0": {
    "sourceHash": 3802457749,
    "valueCount": 5,
    "strings": [
      "\n      <aside class=\"recovery\" aria-label=\"服务端插件离线恢复命令\">\n        <strong>",
      " 上的离线恢复</strong>\n        <small>这些命令会直接编辑配置，无需连接 sessiond 或导入插件，并且不会包含机器凭据。</small>\n        <code>",
      "</code>\n        <code>",
      "</code>\n        <code>",
      "</code>\n        <code>",
      "</code>\n      </aside>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "SettingsPluginsPanel.compare_desired_plugin_config_with_the_active.01be4e5d": {
    "sourceHash": 1988100839,
    "valueCount": 1,
    "strings": [
      "对比 <strong>",
      "</strong> 上的预期插件配置与 sessiond 当前启动快照。此处的配置与 Pi 包安装分开管理。"
    ],
    "order": [
      0
    ]
  },
  "SettingsSessiondPanel.template.26f9a698": {
    "sourceHash": 317077189,
    "valueCount": 5,
    "strings": [
      "\n      <settings-panel-frame\n        heading=\"会话守护进程\"\n        .description=",
      "\n        actionLabel=\"重新加载\"\n        .actionDisabled=",
      "\n        .notices=",
      "\n        .onAction=",
      "\n      >\n        ",
      "\n      </settings-panel-frame>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "SettingsSessiondPanel.config_file_allow_agents_to_start_sessions.534620de": {
    "sourceHash": 1862262092,
    "valueCount": 16,
    "strings": [
      "\n          <div class=\"config-path-card\">\n            <span>配置文件</span>\n            <code>",
      "</code>\n          </div>\n          <div class=\"field\">\n            <span class=\"field-heading\">\n              <span>允许智能体启动会话</span>\n              ",
      "\n            </span>\n            <label class=\"toggle\">\n              <input\n                type=\"checkbox\"\n                .checked=",
      "\n                ?disabled=",
      "\n                @change=",
      "\n              >\n              <span>启用 <code>spawn_session</code> 工具</span>\n            </label>\n            <small>启用后，大语言模型可在同一已注册项目的工作区（任意工作树）中启动新会话，所有创建的会话都会显示在此处。默认启用。</small>\n          </div>\n          <div class=\"field\">\n            <span class=\"field-heading\">\n              <span>允许智能体启动可跟踪的子会话</span>\n              ",
      "\n            </span>\n            <label class=\"toggle\">\n              <input\n                type=\"checkbox\"\n                .checked=",
      "\n                ?disabled=",
      "\n                @change=",
      "\n              >\n              <span>启用 <code>spawn_subsession</code> 工具</span>\n            </label>\n            <small>智能体可启动并持续关联子会话（<code>spawn_subsession</code>、<code>list_subsessions</code>、<code>check_subsession</code>、<code>read_subsession</code>），并在子会话完成时收到通知。需要启用“允许智能体启动会话”。默认启用。</small>\n          </div>\n          <div class=\"field\">\n            <span class=\"field-heading\">\n              <span>允许智能体提问</span>\n              ",
      "\n            </span>\n            <label class=\"toggle\">\n              <input\n                type=\"checkbox\"\n                aria-label=\"启用提问\"\n                .checked=",
      "\n                ?disabled=",
      "\n                @change=",
      "\n              >\n              <span>启用 <code>ask_user</code> 工具</span>\n            </label>\n            <small>智能体可发布结构化问题表单，并暂停等待用户回答。默认启用。</small>\n          </div>\n          <section class=\"effective-card\" aria-label=\"预期会话守护进程配置摘要\">\n            <h3>应用环境变量覆盖后的预期配置</h3>\n            <dl>\n              <div><dt>启动会话</dt><dd>",
      "</dd></div>\n              <div><dt>子会话</dt><dd>",
      "</dd></div>\n              <div><dt>提问</dt><dd>",
      "</dd></div>\n            </dl>\n          </section>\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ]
  },
  "SettingsSessiondPanel.environment_override.d2ca5df0": {
    "sourceHash": 3757151350,
    "valueCount": 0,
    "strings": [
      "<span class=\"override-badge\">环境变量覆盖</span>"
    ],
    "order": []
  },
  "SettingsSessiondPanel.environment_override.e3b11162": {
    "sourceHash": 3757151350,
    "valueCount": 0,
    "strings": [
      "<span class=\"override-badge\">环境变量覆盖</span>"
    ],
    "order": []
  },
  "SettingsSessiondPanel.environment_override.dc37fc31": {
    "sourceHash": 3757151350,
    "valueCount": 0,
    "strings": [
      "<span class=\"override-badge\">环境变量覆盖</span>"
    ],
    "order": []
  },
  "SettingsSessiondPanel.disabled.ef648582": {
    "sourceHash": 1250277432,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">已禁用</span>"
    ],
    "order": []
  },
  "SettingsSessiondPanel.disabled.2f767cdd": {
    "sourceHash": 1250277432,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">已禁用</span>"
    ],
    "order": []
  },
  "SettingsSessiondPanel.disabled.2854ff8e": {
    "sourceHash": 1250277432,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">已禁用</span>"
    ],
    "order": []
  },
  "SettingsSessiondPanel.agent_tool_capabilities_for_sessions_on_changes.b540a794": {
    "sourceHash": 1713389750,
    "valueCount": 1,
    "strings": [
      "",
      " 上会话可用的智能体工具。更改会立即保存，但只有在该机器上的会话守护进程重启后才会生效。"
    ],
    "order": [
      0
    ]
  },
  "SettingsShortcutsPanel.edit_app_shortcuts_by_action_type_a.62a52306": {
    "sourceHash": 3499999161,
    "valueCount": 0,
    "strings": [
      "按操作编辑应用快捷键。可输入 <code>mod+k</code> 或 <code>g p</code> 等快捷键、通过键盘录制、选择“无”禁用，或恢复默认值。不含修饰键的应用快捷键仅在可编辑字段外生效。消息输入框的发送快捷键只能包含一组按键，并在编辑器内优先生效；未分配的 Enter 和 Shift+Enter 用于换行。浏览器报告主指针为粗略指针（通常为触屏），或视口宽度不超过 760px 时，使用触屏或窄屏设置；其余情况使用桌面设置。应用快捷键冲突时，自定义设置优先于默认值；相同优先级按操作 ID 决定，较短的快捷键会覆盖具有相同前缀的较长序列。"
    ],
    "order": []
  },
  "SettingsShortcutsPanel.template.ea509ce7": {
    "sourceHash": 2229956243,
    "valueCount": 5,
    "strings": [
      "\n      <settings-panel-frame\n        heading=\"键盘快捷键\"\n        .description=",
      "\n        actionLabel=\"重新加载\"\n        .actionDisabled=",
      "\n        .notices=",
      "\n        .onAction=",
      "\n      >\n        ",
      "\n      </settings-panel-frame>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "SettingsShortcutsPanel.loading_shortcuts.7e2bb2b0": {
    "sourceHash": 3552745871,
    "valueCount": 0,
    "strings": [
      "<div class=\"loading-card\">正在加载快捷键…</div>"
    ],
    "order": []
  },
  "SettingsShortcutsPanel.config_file_shortcut_overrides_are_saved_under.ee0e1670": {
    "sourceHash": 1480444759,
    "valueCount": 5,
    "strings": [
      "\n          <div class=\"config-path-card\">\n            <span>配置文件</span>\n            <code>",
      "</code>\n            <small>快捷键覆盖设置保存在 <code>shortcuts</code> 中。值为 <code>null</code> 时会禁用该操作的快捷键。</small>\n          </div>\n          <section class=\"shortcut-group\">\n            <h3>发送行为</h3>\n            <label class=\"shortcut-input-label\">\n              <span>智能体运行时发送</span>\n              <select aria-label=\"智能体运行时发送\" .value=",
      " ?disabled=",
      " @change=",
      ">\n                <option value=\"steer\">引导（默认）</option>\n                <option value=\"followUp\">后续消息</option>\n              </select>\n            </label>\n            <p>仅适用于键盘快捷键。“引导”会在下一次模型调用前发送；“后续消息”会等待当前响应完成。</p>\n          </section>\n          ",
      "\n        "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "SettingsShortcutsPanel.no_actions_registered.091cc85f": {
    "sourceHash": 3619360078,
    "valueCount": 0,
    "strings": [
      "<div class=\"loading-card\">尚未注册任何操作。</div>"
    ],
    "order": []
  },
  "SettingsShortcutsPanel.shortcut_save_none_reset.b33ef031": {
    "sourceHash": 147067344,
    "valueCount": 25,
    "strings": [
      "\n      <article class=",
      ">\n        <div class=\"shortcut-main\">\n          <strong>",
      "</strong>\n          ",
      "\n          <small class=\"shortcut-id\">",
      "</small>\n          <small>",
      "</small>\n        </div>\n        <div class=\"shortcut-editor\">\n          <div class=\"shortcut-status\">\n            ",
      "\n            <small class=",
      ">",
      "",
      "</small>\n            ",
      "\n          </div>\n          <label class=\"shortcut-input-label\">\n            <span>快捷键</span>\n            <input\n              class=\"shortcut-input\"\n              data-action-id=",
      "\n              .value=",
      "\n              placeholder=",
      "\n              autocomplete=\"off\"\n              autocapitalize=\"off\"\n              spellcheck=\"false\"\n              ?disabled=",
      "\n              @input=",
      "\n            >\n          </label>\n          ",
      "\n          <div class=\"shortcut-actions\">\n            <button class=\"primary\" ?disabled=",
      " @click=",
      ">保存</button>\n            <button ?disabled=",
      " @click=",
      ">",
      "</button>\n            <button ?disabled=",
      " @click=",
      ">无</button>\n            <button ?disabled=",
      " @click=",
      ">重置</button>\n          </div>\n        </div>\n      </article>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24
    ]
  },
  "SettingsShortcutsPanel.default.a883721c": {
    "sourceHash": 428933789,
    "valueCount": 1,
    "strings": [
      "默认：<kbd>",
      "</kbd>"
    ],
    "order": [
      0
    ]
  },
  "SettingsShortcutsPanel.recording_press_another_key_to_add_a.8c83475a": {
    "sourceHash": 2590945463,
    "valueCount": 1,
    "strings": [
      "正在录制：",
      "。继续按键可添加序列，或等待录制完成。"
    ],
    "order": [
      0
    ]
  },
  "SettingsShortcutsPanel.shadowed_by.64fcd231": {
    "sourceHash": 184024147,
    "valueCount": 1,
    "strings": [
      "被",
      "覆盖"
    ],
    "order": [
      0
    ]
  },
  "SettingsShortcutsPanel.more.5c2687c3": {
    "sourceHash": 64267253,
    "valueCount": 1,
    "strings": [
      "，另有 ",
      " 项"
    ],
    "order": [
      0
    ]
  },
  "SettingsShortcutsPanel.shadows.9daaca06": {
    "sourceHash": 995529822,
    "valueCount": 4,
    "strings": [
      "覆盖 ",
      " 个操作：",
      "",
      ""
    ],
    "order": [
      0,
      2,
      3
    ]
  },
  "SettingsThemePanel.theme_choose_a_theme_on_this_device.d6cd1f89": {
    "sourceHash": 2603002740,
    "valueCount": 18,
    "strings": [
      "\n      <section class=\"theme-card\" aria-labelledby=\"theme-heading\">\n        <header>\n          <h3 id=\"theme-heading\">主题</h3>\n          <p>为此设备选择主题，或为使用默认主题的浏览器保存默认设置。</p>\n        </header>\n        <div class=\"current-theme\" role=\"status\">\n          <strong>",
      "</strong>\n          <span>当前：",
      "</span>\n          <span>默认：",
      "",
      "</span>\n        </div>\n        <label class=\"field\">\n          <span>主题</span>\n          <select aria-label=\"主题\" .value=",
      " ?disabled=",
      " @change=",
      ">\n            ",
      "\n            ",
      "\n          </select>\n        </label>\n        <label class=\"auto-field\">\n          <input type=\"checkbox\" .checked=",
      " ?disabled=",
      " @change=",
      ">\n          <span>自动 <small>主题包含明暗配对时，跟随此设备的明暗偏好。</small></span>\n        </label>\n        <div class=\"theme-actions\">\n          <button class=\"primary\" ?disabled=",
      " @click=",
      ">在此设备使用</button>\n          <button ?disabled=",
      " @click=",
      ">设为默认</button>\n          <button ?disabled=",
      " @click=",
      ">使用默认设置</button>\n        </div>\n        <p class=\"hint\">设置默认主题不会更改已保存的设备选择。选择“使用默认设置”可清除此设备的覆盖设置。</p>\n      </section>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17
    ]
  },
  "SettingsThemePanel.unavailable.58a76ce3": {
    "sourceHash": 3531643625,
    "valueCount": 2,
    "strings": [
      "<option value=",
      ">",
      " （不可用）</option>"
    ],
    "order": [
      0,
      1
    ]
  },
  "SettingsThemePanel.unavailable.98a0d016": {
    "sourceHash": 2815224032,
    "valueCount": 1,
    "strings": [
      "",
      " （不可用）"
    ],
    "order": [
      0
    ]
  },
  "piPackageSettings.local_gateway.2e99f041": {
    "sourceHash": 3354719241,
    "valueCount": 1,
    "strings": [
      "",
      "（本地网关）"
    ],
    "order": [
      0
    ]
  },
  "piPackageSettings.remote_machine.31e385eb": {
    "sourceHash": 3913099479,
    "valueCount": 1,
    "strings": [
      "",
      "（远程机器）"
    ],
    "order": [
      0
    ]
  },
  "piPackageSettings.on.6801b022": {
    "sourceHash": 258254432,
    "valueCount": 1,
    "strings": [
      "（",
      "）"
    ],
    "order": [
      0
    ]
  },
  "piPackageSettings.each_idle_pi_web_session_on.92b7bf49": {
    "sourceHash": 4142155070,
    "valueCount": 1,
    "strings": [
      "",
      " 上每个空闲的 PI WEB 会话"
    ],
    "order": [
      0
    ]
  },
  "piPackageSettings.pi_web_browser_plugin_changes_served_by.43ef0c97": {
    "sourceHash": 2348176318,
    "valueCount": 1,
    "strings": [
      "",
      " 提供的 PI WEB 浏览器插件更改"
    ],
    "order": [
      0
    ]
  },
  "piPackageSettings.pi_package_type_reload_in_to_rediscover.fbb460d2": {
    "sourceHash": 182937292,
    "valueCount": 4,
    "strings": [
      "Pi 包",
      "",
      "。请在",
      "中输入 /reload，以重新发现 Pi 运行时资源：扩展、技能、提示词模板、主题及上下文/系统提示词文件。另需重新加载浏览器页面，使",
      "生效。"
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "piPackageSettings.timed_out_while_contacting_for_pi_package.d2ba3bab": {
    "sourceHash": 202135326,
    "valueCount": 1,
    "strings": [
      "连接 ",
      " 管理 Pi 包时超时。包操作可能仍在远程运行；重试前请先重新加载包列表。"
    ],
    "order": [
      0
    ]
  },
  "piPackageSettings.could_not_reach_for_pi_package_management.9bed0517": {
    "sourceHash": 1857373709,
    "valueCount": 1,
    "strings": [
      "无法连接 ",
      " 管理 Pi 包。请检查机器连接后重试。"
    ],
    "order": [
      0
    ]
  },
  "settingsConfigDraft.allowed_external_paths_must_be_absolute_paths.7185bde1": {
    "sourceHash": 2017774306,
    "valueCount": 1,
    "strings": [
      "允许的外部路径必须是绝对路径或以 ~ 开头：",
      ""
    ],
    "order": [
      0
    ]
  },
  "settingsConfigDraft.must_be_workspace_relative.1050254c": {
    "sourceHash": 1210508813,
    "valueCount": 1,
    "strings": [
      "",
      "必须是相对于工作区的路径。"
    ],
    "order": [
      0
    ]
  },
  "settingsConfigDraft.must_not_contain_path_traversal.3e60bfc4": {
    "sourceHash": 3802532056,
    "valueCount": 1,
    "strings": [
      "",
      "不能包含向上跳转的路径。"
    ],
    "order": [
      0
    ]
  },
  "settingsDataLoading.config.a17e80b6": {
    "sourceHash": 3089959169,
    "valueCount": 1,
    "strings": [
      "配置：",
      ""
    ],
    "order": [
      0
    ]
  },
  "settingsDataLoading.pi_web_plugins.42d1fdf5": {
    "sourceHash": 732938532,
    "valueCount": 1,
    "strings": [
      "PI WEB 插件：",
      ""
    ],
    "order": [
      0
    ]
  },
  "settingsDataLoading.failed_to_load_settings.286de0fd": {
    "sourceHash": 1559568706,
    "valueCount": 1,
    "strings": [
      "加载设置失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "settingsDataLoading.failed_to_load_pi_packages_from.102afee5": {
    "sourceHash": 3663036025,
    "valueCount": 2,
    "strings": [
      "从 ",
      " 加载 Pi 包失败：",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "settingsMachineTarget.local_gateway.f0c12e35": {
    "sourceHash": 3354719241,
    "valueCount": 1,
    "strings": [
      "",
      "（本地网关）"
    ],
    "order": [
      0
    ]
  },
  "settingsMachineTarget.remote_machine.9d494487": {
    "sourceHash": 3913099479,
    "valueCount": 1,
    "strings": [
      "",
      "（远程机器）"
    ],
    "order": [
      0
    ]
  },
  "settingsMachineTarget.plugin_lifecycle_diagnostics_are_not_available_on.35795395": {
    "sourceHash": 419115403,
    "valueCount": 1,
    "strings": [
      "",
      " 不支持插件生命周期诊断。加载依赖服务端的插件前，请更新并重启该机器上的 PI WEB。"
    ],
    "order": [
      0
    ]
  },
  "settingsMachineTarget.timed_out_while_contacting_for_selected_machine.33ed05b3": {
    "sourceHash": 3603909935,
    "valueCount": 1,
    "strings": [
      "连接 ",
      " 获取所选机器设置时超时。操作可能仍在远程运行；重试前请先重新加载。"
    ],
    "order": [
      0
    ]
  },
  "settingsMachineTarget.could_not_reach_for_selected_machine_settings.782122db": {
    "sourceHash": 105647085,
    "valueCount": 1,
    "strings": [
      "无法连接 ",
      " 获取所选机器设置。请检查机器连接后重试。"
    ],
    "order": [
      0
    ]
  },
  "composerShortcuts.send_message.2f4c7908": {
    "sourceHash": 4033220988,
    "valueCount": 1,
    "strings": [
      "发送消息 — ",
      ""
    ],
    "order": [
      0
    ]
  },
  "authController.no_stored_credentials_for.65d740e5": {
    "sourceHash": 192082630,
    "valueCount": 1,
    "strings": [
      "没有保存 ",
      " 的凭据"
    ],
    "order": [
      0
    ]
  },
  "authController.auth_provider_not_found.5e40c25e": {
    "sourceHash": 194985717,
    "valueCount": 1,
    "strings": [
      "找不到身份验证服务商：",
      ""
    ],
    "order": [
      0
    ]
  },
  "piWebStatusController.pi_web_update_check_failed.4e7ee2fd": {
    "sourceHash": 781515266,
    "valueCount": 1,
    "strings": [
      "PI WEB 更新检查失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "sessionController.queued_command_needs_input_open_the_session.a65fe2d5": {
    "sourceHash": 3028798094,
    "valueCount": 1,
    "strings": [
      "排队命令“",
      "”需要输入；请打开会话并重新运行。"
    ],
    "order": [
      0
    ]
  },
  "sessionController.archive_failed.c1c6e651": {
    "sourceHash": 2350348950,
    "valueCount": 1,
    "strings": [
      "归档失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "sessionController.delete_failed.e2f7b5bf": {
    "sourceHash": 3235342743,
    "valueCount": 1,
    "strings": [
      "删除失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "sessionController.failed_for_session.f1f825b1": {
    "sourceHash": 2399981669,
    "valueCount": 4,
    "strings": [
      "",
      " ",
      " 个会话失败：",
      ""
    ],
    "order": [
      0,
      1,
      3
    ]
  },
  "sessionController.session_started_but_it_could_not_be.f66fda44": {
    "sourceHash": 1073818410,
    "valueCount": 1,
    "strings": [
      "会话已启动，但无法选择：",
      ""
    ],
    "order": [
      0
    ]
  },
  "sessionController.session_started_but_it_could_not_be.ab706ede": {
    "sourceHash": 1073818410,
    "valueCount": 1,
    "strings": [
      "会话已启动，但无法选择：",
      ""
    ],
    "order": [
      0
    ]
  },
  "sessionController.failed_to_start_session.9d1c37e6": {
    "sourceHash": 1796107777,
    "valueCount": 1,
    "strings": [
      "启动会话失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "sessionController.queued_will_send_when_the_backend_session.4b699284": {
    "sourceHash": 186339852,
    "valueCount": 2,
    "strings": [
      "后端会话就绪后将发送 ",
      " 条排队消息"
    ],
    "order": [
      0
    ]
  },
  "sessionController.queued_kept_below.ccab7fdb": {
    "sourceHash": 2098793526,
    "valueCount": 2,
    "strings": [
      " · 下方保留了 ",
      " 条排队消息"
    ],
    "order": [
      0
    ]
  },
  "sessionController.template.081560b5": {
    "sourceHash": 382381097,
    "valueCount": 2,
    "strings": [
      "",
      " 个附件"
    ],
    "order": [
      0
    ]
  },
  "sessionController.queued.39dbdd22": {
    "sourceHash": 115097818,
    "valueCount": 1,
    "strings": [
      "[",
      "已排队]"
    ],
    "order": [
      0
    ]
  },
  "sessionController.more.c558263c": {
    "sourceHash": 64267253,
    "valueCount": 1,
    "strings": [
      "，另有 ",
      " 个"
    ],
    "order": [
      0
    ]
  },
  "sessionController.queued.0a507d46": {
    "sourceHash": 1322154460,
    "valueCount": 3,
    "strings": [
      "[",
      "已排队：",
      "",
      "]"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "sessionNotificationController.failed_to_dismiss_notification.3a180852": {
    "sourceHash": 3514571508,
    "valueCount": 1,
    "strings": [
      "关闭通知失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "sessionNotificationController.failed_to_dismiss_session_notifications.82046265": {
    "sourceHash": 1663548629,
    "valueCount": 1,
    "strings": [
      "关闭会话通知失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "workspaceController.workspace_not_found.2c6716a6": {
    "sourceHash": 4164764859,
    "valueCount": 1,
    "strings": [
      "找不到工作区：",
      ""
    ],
    "order": [
      0
    ]
  },
  "workspaceController.workspace_not_found.af868a7a": {
    "sourceHash": 4164764859,
    "valueCount": 1,
    "strings": [
      "找不到工作区：",
      ""
    ],
    "order": [
      0
    ]
  },
  "workspaceController.session_not_found.86c53063": {
    "sourceHash": 2653108856,
    "valueCount": 1,
    "strings": [
      "找不到会话：",
      ""
    ],
    "order": [
      0
    ]
  },
  "workspaceController.session_not_found.83617599": {
    "sourceHash": 2653108856,
    "valueCount": 1,
    "strings": [
      "找不到会话：",
      ""
    ],
    "order": [
      0
    ]
  },
  "markdown.template.30f22a99": {
    "sourceHash": 861335933,
    "valueCount": 2,
    "strings": [
      "<div class=\"code-block-header\" role=\"group\" aria-label=\"代码块操作\">",
      "",
      "</div>"
    ],
    "order": [
      0,
      1
    ]
  },
  "keyboardShortcuts.shortcut_has_duplicate_modifiers.860fe898": {
    "sourceHash": 1845052264,
    "valueCount": 1,
    "strings": [
      "快捷键包含重复的 ",
      " 修饰键。"
    ],
    "order": [
      0
    ]
  },
  "keyboardShortcuts.unsupported_shortcut_key.2b3e2a99": {
    "sourceHash": 1020465823,
    "valueCount": 1,
    "strings": [
      "不支持的快捷键按键：",
      ""
    ],
    "order": [
      0
    ]
  },
  "messageActions.copy_message.caa2c0f2": {
    "sourceHash": 1935321143,
    "valueCount": 1,
    "strings": [
      "复制",
      "的消息"
    ],
    "order": [
      0
    ]
  },
  "messageActions.copied_message.eb473c93": {
    "sourceHash": 2428551886,
    "valueCount": 1,
    "strings": [
      "已复制",
      "的消息"
    ],
    "order": [
      0
    ]
  },
  "requiredTerminalFacade.required_terminal_plugin_is_unavailable_on_machine.0836b061": {
    "sourceHash": 4284556262,
    "valueCount": 1,
    "strings": [
      "机器 ",
      " 上的必需终端插件不可用。请打开设置查看恢复说明。"
    ],
    "order": [
      0
    ]
  },
  "queuedMessageActions.template.170f0071": {
    "sourceHash": 382381097,
    "valueCount": 2,
    "strings": [
      "",
      " 个附件"
    ],
    "order": [
      0
    ]
  },
  "queuedMessageActions.later.360d6ec8": {
    "sourceHash": 3405940799,
    "valueCount": 2,
    "strings": [
      "",
      " 条后续引导消息"
    ],
    "order": [
      0
    ]
  },
  "queuedMessageActions.queued.a552a28d": {
    "sourceHash": 1782324620,
    "valueCount": 2,
    "strings": [
      "",
      " 条排队后续消息"
    ],
    "order": [
      0
    ]
  },
  "queuedMessageActions.this_will_also_remove.139efef8": {
    "sourceHash": 2148320076,
    "valueCount": 2,
    "strings": [
      "",
      "\n\n这还将移除 ",
      "。"
    ],
    "order": [
      0,
      1
    ]
  },
  "sessionCleanupUi.archive_idle.b3d9ebc8": {
    "sourceHash": 3005967677,
    "valueCount": 2,
    "strings": [
      "归档 ",
      " 个空闲会话"
    ],
    "order": [
      0
    ]
  },
  "sessionCleanupUi.permanently_delete_archived.6cc7f8f1": {
    "sourceHash": 2892937111,
    "valueCount": 2,
    "strings": [
      "永久删除 ",
      " 个已归档会话"
    ],
    "order": [
      0
    ]
  },
  "sessionCleanupUi.run_cleanup_and_permanent_deletion_only_applies.9b2e421b": {
    "sourceHash": 267301394,
    "valueCount": 1,
    "strings": [
      "确定要",
      "吗？\n\n永久删除仅适用于已归档会话，且无法撤销。"
    ],
    "order": [
      0
    ]
  },
  "sessionCleanupUi.must_be_set.663d9951": {
    "sourceHash": 1257413621,
    "valueCount": 1,
    "strings": [
      "请设置",
      "。"
    ],
    "order": [
      0
    ]
  },
  "sessionCleanupUi.must_be_a_non_negative_whole_number.db9638d9": {
    "sourceHash": 3510126081,
    "valueCount": 1,
    "strings": [
      "",
      "必须为非负整数。"
    ],
    "order": [
      0
    ]
  },
  "sessionNotifications.notification_received.69014d66": {
    "sourceHash": 3520470041,
    "valueCount": 1,
    "strings": [
      "收到",
      "通知。"
    ],
    "order": [
      0
    ]
  },
  "sessionNotifications.notifications.79a0e626": {
    "sourceHash": 999744122,
    "valueCount": 1,
    "strings": [
      "通知（",
      "）"
    ],
    "order": [
      0
    ]
  },
  "sessionNotifications.dismiss_notification.6a5f88f3": {
    "sourceHash": 3742191350,
    "valueCount": 1,
    "strings": [
      "关闭",
      "通知"
    ],
    "order": [
      0
    ]
  },
  "sessionNotifications.dismiss_notification.9cbba796": {
    "sourceHash": 1064515838,
    "valueCount": 1,
    "strings": [
      "关闭通知：",
      ""
    ],
    "order": [
      0
    ]
  },
  "sessionNotifications.older_not_shown.bcc856ea": {
    "sourceHash": 697797185,
    "valueCount": 2,
    "strings": [
      "另有 ",
      " 条较早的通知未显示。"
    ],
    "order": [
      0
    ]
  },
  "sessionNotifications.message_truncated_at_kib.20e3e6e1": {
    "sourceHash": 4189584423,
    "valueCount": 1,
    "strings": [
      "消息已在 ",
      " KiB 处截断。"
    ],
    "order": [
      0
    ]
  },
  "sessionTreeModel.custom_summary_focus_must_be_characters_or.b6873ba4": {
    "sourceHash": 4118515872,
    "valueCount": 1,
    "strings": [
      "自定义摘要重点说明不能超过 ",
      " 个字符。"
    ],
    "order": [
      0
    ]
  }
} as const;
