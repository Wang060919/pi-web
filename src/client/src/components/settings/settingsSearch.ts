import { t } from "../../../../shared/i18n";
import type { SettingsSection } from "../../settingsRoute";

export interface SettingsSearchItem {
  id: string;
  section: SettingsSection;
  label: string;
  keywords: string;
  selector?: string;
}

/** Only supported settings are indexed; selectors identify rows across panel shadow roots. */
export function settingsSearchItems(): SettingsSearchItem[] {
  return [
    { id: "language", section: "general", label: t("settings.language.title"), keywords: "language locale chinese english 中文 英文 语言", selector: "settings-language-panel" },
    { id: "theme", section: "general", label: t("settingsAppearance.theme"), keywords: "theme appearance light dark 外观 主题 深色 浅色", selector: ".theme-card .field" },
    { id: "theme-mode", section: "general", label: t("settingsAppearance.mode"), keywords: "system auto fixed 系统 自动 固定", selector: ".theme-card .mode-row" },
    { id: "chat-text-size", section: "general", label: t("settingsChatText.size"), keywords: "font size text small medium large transcript conversation composer 字体 字号 文字 大小 会话 正文 输入框", selector: '[data-setting-id="chat-text-size"]' },
    { id: "host", section: "connection", label: t("settingsSearch.host"), keywords: "host address bind server 主机 地址 绑定 连接", selector: '[data-setting-id="host"]' },
    { id: "port", section: "connection", label: t("settingsSearch.port"), keywords: "port server 端口 连接", selector: '[data-setting-id="port"]' },
    { id: "allowed-hosts", section: "connection", label: t("settingsSearch.allowedHosts"), keywords: "allowed hosts 域名 允许 主机 白名单", selector: '[data-setting-id="allowed-hosts"]' },
    { id: "paths", section: "connection", label: t("settingsSearch.paths"), keywords: "filesystem external paths roots 文件 外部 目录 路径 权限", selector: '[data-setting-id="paths"]' },
    { id: "uploads", section: "connection", label: t("settingsSearch.uploads"), keywords: "upload folder 上传 目录 文件", selector: '[data-setting-id="uploads"]' },
    { id: "attachments", section: "connection", label: t("settingsSearch.attachments"), keywords: "attachment folder 附件 目录", selector: '[data-setting-id="attachments"]' },
    { id: "send", section: "shortcuts", label: t("settingsSearch.send"), keywords: "send enter shift keyboard shortcuts 发送 回车 换行 快捷键", selector: '[data-setting-id="send"]' },
    { id: "models", section: "models", label: t("modelsSettings.heading"), keywords: "models provider api key base url token 模型 供应商 密钥 接口 地址" },
    { id: "mcp", section: "mcp", label: t("ui.settings.mcp"), keywords: "mcp connectors tools integration 连接器 工具 集成 服务" },
    { id: "skills", section: "skills", label: t("inspection.skills"), keywords: "skills instructions 技能 指令" },
    { id: "packages", section: "packages", label: t("SettingsDialog.pi_packages.91f80e11"), keywords: "packages install npm 包 安装 扩展" },
    { id: "plugins", section: "plugins", label: t("settingsSearch.plugins"), keywords: "plugins extensions enable disable 插件 扩展 启用 禁用" },
    { id: "sessiond", section: "sessiond", label: t("settingsSearch.sessiond"), keywords: "session daemon spawn agents 会话 守护进程 启动 代理" },
  ];
}

export function searchSettings(items: readonly SettingsSearchItem[], query: string): SettingsSearchItem[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  if (terms.length === 0) return [];
  return items.filter((item) => {
    const text = `${item.label} ${item.section} ${item.keywords}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  }).slice(0, 16);
}

export async function findSettingsElement(root: ParentNode, selector: string): Promise<HTMLElement | undefined> {
  const host = root instanceof ShadowRoot ? root.host : root;
  if (host instanceof HTMLElement && "updateComplete" in host) await host.updateComplete;
  const direct = root.querySelector<HTMLElement>(selector);
  if (direct !== null) return direct;
  for (const node of root.querySelectorAll<HTMLElement>("*")) {
    if (!(node.shadowRoot instanceof ShadowRoot)) continue;
    if ("updateComplete" in node) await node.updateComplete;
    const match = await findSettingsElement(node.shadowRoot, selector);
    if (match !== undefined) return match;
  }
  return undefined;
}
