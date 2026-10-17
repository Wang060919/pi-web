// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "pi-web-plugin.unavailable.18c46b0c": "不可用",
  "pi-web-plugin.restart_needed.c2ca8efe": "需要重启",
  "pi-web-plugin.current.4dc8aa30": "正常",
  "pi-web-plugin.additional_commands_optional.ba69f0f0": "其他命令（可选）",
  "pi-web-plugin.suggested_commands.c05fb39a": "建议命令",
  "pi-web-plugin.check_for_pi_web_updates.19deb5dc": "检查 PI WEB 更新",
  "pi-web-plugin.bypass_cached_release_data_and_check_the.b905ed4e": "跳过缓存的版本数据，立即检查所选计算机",
  "pi-web-plugin.updates.8b356b23": "更新",
  "pi-web-plugin.update_checks_require_a_newer_pi_web.2a598b9f": "更新检查需要更高版本的 PI WEB 网关",
  "pi-web-plugin.updates.f1830542": "更新",
  "updatesLogic.update_pi_web.2cbdf77a": "更新 PI WEB",
  "updatesLogic.restart_everything.55320f26": "重启全部服务",
  "updatesLogic.update.66abfc01": "更新",
  "updatesLogic.restart_all.04d4b249": "重启全部服务",
  "updatesLogic.restart_web_ui.267dce69": "重启网页界面",
  "updatesLogic.restart_session_daemon.995e3f30": "重启会话守护进程",
  "updatesLogic.status.3c933ee5": "状态",
  "updatesLogic.federated_status_unavailable.87d84f86": "联合状态不可用",
  "updatesLogic.web_ui.2cd4616e": "网页界面",
  "updatesLogic.session_daemon.9e3fe90d": "会话守护进程",
  "updatesLogic.docker_update_commands_available.780127fe": "可使用 Docker 更新命令",
  "updatesLogic.this_updates_plugin_was_loaded_from_a.86f7b142": "此更新插件已从 Docker PI WEB 环境中加载，但网关尚未提供 Docker 状态详情。仍可使用下方的 Docker 维护命令。",
  "updatesLogic.unknown.172e52ad": "未知",
  "updatesLogic.installation_unknown.18c85529": "安装方式未知",
  "updatesLogic.pi_package.716145a9": "Pi 包",
  "updatesLogic.global_npm_package.d87a26a9": "全局 npm 包",
  "updatesLogic.local_checkout.e5505e31": "本地源码",
  "updatesLogic.docker_development_runtime.ff5d1b2d": "Docker 开发环境",
  "updatesLogic.docker_runtime.4726dda4": "Docker 运行环境",
  "updatesLogic.installation_unknown.27bc9914": "安装方式未知",
  "ui.component.web": "网页界面",
  "ui.component.sessiond": "会话守护进程",
  "ui.severity.info": "信息",
  "ui.severity.warning": "警告",
  "ui.severity.error": "错误"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "pi-web-plugin.running_installed.bc30c0e4": {
    "sourceHash": 3658040771,
    "valueCount": 6,
    "strings": [
      "\n    <div class=\"updates-version-row\">\n      <strong>",
      "</strong>\n      <span>",
      "</span>\n      <small>运行版本 ",
      " · 已安装 ",
      "</small>\n      <small>",
      "",
      "</small>\n    </div>\n  "
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
  "pi-web-plugin.copy.331a0f6e": {
    "sourceHash": 906789350,
    "valueCount": 2,
    "strings": [
      "\n    <span class=\"updates-command-actions\">\n      <button @click=",
      ">复制</button>\n      ",
      "\n    </span>\n  "
    ],
    "order": [
      0,
      1
    ]
  },
  "pi-web-plugin.run.7ae8c817": {
    "sourceHash": 2524662781,
    "valueCount": 1,
    "strings": [
      "<button class=\"primary\" @click=",
      ">运行</button>"
    ],
    "order": [
      0
    ]
  },
  "pi-web-plugin.no_pi_web_update_or_restart_messages.d76088b8": {
    "sourceHash": 3793286573,
    "valueCount": 0,
    "strings": [
      "<p class=\"muted\">没有 PI WEB 更新或重启消息。</p>"
    ],
    "order": []
  },
  "pi-web-plugin.recommended.a9c2c7b1": {
    "sourceHash": 2892466601,
    "valueCount": 2,
    "strings": [
      "\n    <section class=\"updates-recommended\">\n      <strong>建议操作</strong>\n      ",
      "\n      ",
      "\n    </section>\n  "
    ],
    "order": [
      0,
      1
    ]
  },
  "pi-web-plugin.run_the_recommended_command_updates_require_confirmatio.479b700c": {
    "sourceHash": 3749956491,
    "valueCount": 0,
    "strings": [
      "<p class=\"muted\">运行建议命令。更新需要在终端中确认，并可能中断活动会话；如果此终端无法安全运行更新，命令行工具会给出操作说明。</p>"
    ],
    "order": []
  },
  "pi-web-plugin.only_needed_for_finer_control_such_as.311bfb03": {
    "sourceHash": 77221331,
    "valueCount": 0,
    "strings": [
      "<p class=\"muted\">仅在需要精细控制时使用，例如重启单个服务。</p>"
    ],
    "order": []
  },
  "pi-web-plugin.updates_checking_pi_web_update_status.cef9023a": {
    "sourceHash": 4255796060,
    "valueCount": 0,
    "strings": [
      "\n      <section class=\"toolbar\"><strong>更新</strong></section>\n      <section class=\"viewer\"><p class=\"muted\">正在检查 PI WEB 更新状态…</p></section>\n    "
    ],
    "order": []
  },
  "pi-web-plugin.viewer_updates_status_flex_auto_min_height.4a083b3c": {
    "sourceHash": 982043590,
    "valueCount": 10,
    "strings": [
      "\n    <style>\n      .viewer.updates-status { flex: 1 1 auto; min-height: 0; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; padding: 12px; font: 400 13px/18px var(--pi-font-family, system-ui, sans-serif); overflow-y: auto; overflow-x: hidden; }\n      .viewer.updates-status section { flex: 0 0 auto; min-width: 0; display: grid; gap: 8px; }\n      .toolbar strong, .viewer.updates-status strong { font-weight: 500; }\n      .updates-message { display: grid; gap: 5px; border: 0; border-radius: 8px; padding: 10px; background: var(--pi-surface); }\n      .updates-message.warning { border: 1px solid var(--pi-warning-border); background: var(--pi-warning-surface); }\n      .updates-message.error { border: 1px solid var(--pi-danger); }\n      .updates-message-title { display: flex; gap: 8px; align-items: baseline; }\n      .updates-message-title span { color: var(--pi-muted); font-size: 12px; line-height: 16px; }\n      .updates-version-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; border-bottom: 0; padding: 6px 0; }\n      .updates-version-row small { grid-column: 1 / -1; color: var(--pi-muted); }\n      .updates-command { min-width: 0; display: grid; grid-template-columns: minmax(90px, auto) minmax(0, 1fr) auto; gap: 8px; align-items: center; }\n      .updates-command code { overflow: auto; border: 0; border-radius: 6px; background: var(--pi-bg); padding: 5px 7px; font: 12px/1.46 var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); white-space: nowrap; }\n      .updates-command-actions { display: inline-flex; gap: 6px; }\n      .updates-command-actions button.primary { border: 0; background: var(--pi-selection-bg); color: var(--pi-text); }\n      .updates-command-actions button.primary:not(:disabled):hover { background: var(--pi-surface-hover); }\n      .updates-recommended { border: 0; border-radius: 8px; padding: 10px; background: var(--pi-surface); }\n      .updates-recommended > strong { color: var(--pi-text-bright); }\n      .updates-recommended .updates-message { border: none; background: none; padding: 0; }\n      .updates-meta { display: grid; gap: 2px; color: var(--pi-muted); font-size: 12px; line-height: 16px; }\n      @media (max-width: 520px) {\n        .updates-command { grid-template-columns: minmax(0, 1fr) auto; }\n        .updates-command > span { grid-column: 1 / -1; }\n      }\n    </style>\n    <section class=\"toolbar\"><strong>更新</strong>",
      "</section>\n    <section class=\"viewer updates-status\">\n      ",
      "\n\n      <section>\n        <strong>已安装的服务</strong>\n        ",
      "\n        ",
      "\n      </section>\n\n      ",
      "\n\n      <section class=\"updates-meta\">\n        <span>生成时间 ",
      "</span>\n        ",
      "\n        ",
      "\n        ",
      "\n        ",
      "\n      </section>\n    </section>\n  "
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
  "pi-web-plugin.latest_npm_release.243fa0ef": {
    "sourceHash": 2301969835,
    "valueCount": 1,
    "strings": [
      "<span>npm 最新版本 ",
      "</span>"
    ],
    "order": [
      0
    ]
  },
  "pi-web-plugin.release_checked.aafc222b": {
    "sourceHash": 1210022078,
    "valueCount": 1,
    "strings": [
      "<span>版本检查时间 ",
      "</span>"
    ],
    "order": [
      0
    ]
  },
  "pi-web-plugin.remote_version_check_skipped.59f53a87": {
    "sourceHash": 2126231458,
    "valueCount": 0,
    "strings": [
      "<span>已跳过远程版本检查。</span>"
    ],
    "order": []
  },
  "pi-web-plugin.remote_version_check_failed.a4ab28ab": {
    "sourceHash": 1152811383,
    "valueCount": 1,
    "strings": [
      "<span>远程版本检查失败：",
      "</span>"
    ],
    "order": [
      0
    ]
  }
} as const;
