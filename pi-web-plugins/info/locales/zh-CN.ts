// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "infoInternals.unknown.803893ed": "未知",
  "infoInternals.installation_unknown.886b58ac": "安装方式未知",
  "infoInternals.pi_package.23fb2fae": "Pi 包",
  "infoInternals.global_npm_package.90e0a1d3": "全局 npm 包",
  "infoInternals.local_checkout.848f62a2": "本地检出",
  "infoInternals.docker_development_runtime.6aea1c6b": "Docker 开发环境",
  "infoInternals.docker_runtime.5d5a150c": "Docker 运行环境",
  "infoInternals.installation_unknown.2361b8fb": "安装方式未知",
  "infoInternals.local_machine.af085924": "本地计算机",
  "infoInternals.remote_machine.cef1f0d7": "远程计算机",
  "infoInternals.update_available.ec3af8df": "有可用更新",
  "infoInternals.update_check_skipped.119c4959": "已跳过更新检查",
  "infoInternals.up_to_date.ee0814c0": "已是最新版本",
  "infoInternals.folder_workspace.f60a32ec": "文件夹工作区",
  "infoInternals.main_workspace.ca8b8ea7": "主工作区",
  "infoInternals.pi_web_diagnostics.291d66ab": "PI WEB 诊断信息",
  "infoInternals.status_unavailable.ea1e4a84": "状态：不可用",
  "infoInternals.workspace_none_selected.6cded959": "工作区：未选择",
  "infoInternals.template.93f0b894": "，",
  "pi-web-plugin.copy_pi_web_diagnostics.87241f21": "复制 PI WEB 诊断信息",
  "pi-web-plugin.copy_version_installation_and_status_details_for.87c3040a": "复制此计算机的版本、安装和状态详情，便于粘贴到问题报告中",
  "pi-web-plugin.info.57902ba5": "信息",
  "pi-web-plugin.folder.d09be788": "文件夹",
  "pi-web-plugin.info.61667373": "信息",
  "ui.health.current": "正常",
  "ui.health.restart": "需要重启",
  "ui.health.unavailable": "不可用",
  "ui.component.web": "网页界面",
  "ui.component.sessiond": "会话守护进程"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "infoInternals.update_available.ec7cab25": {
    "sourceHash": 2483123797,
    "valueCount": 1,
    "strings": [
      "有可用更新：",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.update_check_failed.ca499b2b": {
    "sourceHash": 859753637,
    "valueCount": 1,
    "strings": [
      "更新检查失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.running.b8f221e0": {
    "sourceHash": 1473505042,
    "valueCount": 1,
    "strings": [
      "运行版本 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.installed.eefd6f39": {
    "sourceHash": 2104931451,
    "valueCount": 1,
    "strings": [
      "已安装 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.error.23495af3": {
    "sourceHash": 936228361,
    "valueCount": 1,
    "strings": [
      "错误：",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.session_daemon_running.a517b4dd": {
    "sourceHash": 505536138,
    "valueCount": 1,
    "strings": [
      "会话守护进程运行版本 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.provider.d94abe6d": {
    "sourceHash": 4235248044,
    "valueCount": 1,
    "strings": [
      "提供方：",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.package.6f1c85f5": {
    "sourceHash": 1152257575,
    "valueCount": 1,
    "strings": [
      "软件包：",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.template.82909293": {
    "sourceHash": 1656583091,
    "valueCount": 2,
    "strings": [
      "",
      "： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "infoInternals.template.3cba3a52": {
    "sourceHash": 1656583091,
    "valueCount": 2,
    "strings": [
      "",
      "： ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "infoInternals.checked.8b95f7f1": {
    "sourceHash": 3082233885,
    "valueCount": 1,
    "strings": [
      "（检查时间 ",
      "）"
    ],
    "order": [
      0
    ]
  },
  "infoInternals.release.0332139b": {
    "sourceHash": 1487881526,
    "valueCount": 2,
    "strings": [
      "发布状态：",
      "",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "infoInternals.status_generated.051055ed": {
    "sourceHash": 1509872570,
    "valueCount": 1,
    "strings": [
      "状态生成时间：",
      ""
    ],
    "order": [
      0
    ]
  },
  "infoInternals.machine.06bfb269": {
    "sourceHash": 3484462295,
    "valueCount": 2,
    "strings": [
      "计算机：",
      "（",
      "）"
    ],
    "order": [
      0,
      1
    ]
  },
  "infoInternals.workspace.2d466c07": {
    "sourceHash": 3174417703,
    "valueCount": 3,
    "strings": [
      "工作区：",
      " — ",
      "（",
      "）"
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "infoInternals.pi_web_pi_web_status_is_not.7a7e9d57": {
    "sourceHash": 1949411189,
    "valueCount": 0,
    "strings": [
      "\n      <section>\n        <strong>PI WEB</strong>\n        <p class=\"muted\">PI WEB 状态暂不可用，将在后台自动刷新。</p>\n      </section>\n    "
    ],
    "order": []
  },
  "infoInternals.pi_web_version_pi_package_installation_release.382b030a": {
    "sourceHash": 1372516493,
    "valueCount": 13,
    "strings": [
      "\n    <section>\n      <strong>PI WEB</strong>\n      <div class=\"info-row\">\n        <span>版本</span>\n        <span>",
      "</span>\n        ",
      "\n      </div>\n      <div class=\"info-row\">\n        <span>Pi</span>\n        <span>",
      "</span>\n        ",
      "\n      </div>\n      <div class=\"info-row\">\n        <span>软件包</span>\n        <span>",
      "</span>\n      </div>\n      <div class=\"info-row\">\n        <span>安装方式</span>\n        <span>",
      "</span>\n        ",
      "\n      </div>\n      <div class=\"info-row\">\n        <span>发布状态</span>\n        <span>",
      "</span>\n        ",
      "\n      </div>\n      ",
      "\n      <p class=\"muted\">状态生成时间 ",
      "</p>\n    </section>\n    <section>\n      <strong>服务</strong>\n      ",
      "\n      ",
      "\n    </section>\n  "
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
  "infoInternals.installed.510a7424": {
    "sourceHash": 2514910012,
    "valueCount": 1,
    "strings": [
      "<small>已安装 ",
      "</small>"
    ],
    "order": [
      0
    ]
  },
  "infoInternals.checked.19689557": {
    "sourceHash": 3138833859,
    "valueCount": 1,
    "strings": [
      "<small>检查时间 ",
      "</small>"
    ],
    "order": [
      0
    ]
  },
  "infoInternals.status_open_the_updates_tab_for_details.757946cf": {
    "sourceHash": 588103431,
    "valueCount": 2,
    "strings": [
      "<p class=\"muted\">",
      " 条状态消息 — 打开“更新”选项卡查看详情。</p>"
    ],
    "order": [
      0
    ]
  },
  "infoInternals.machine_name_type.174986be": {
    "sourceHash": 1016189113,
    "valueCount": 2,
    "strings": [
      "\n    <section>\n      <strong>计算机</strong>\n      <div class=\"info-row\">\n        <span>名称</span>\n        <span>",
      "</span>\n      </div>\n      <div class=\"info-row\">\n        <span>类型</span>\n        <span>",
      "</span>\n      </div>\n    </section>\n  "
    ],
    "order": [
      0,
      1
    ]
  },
  "infoInternals.workspace_name_path.e08d5fd2": {
    "sourceHash": 2617638557,
    "valueCount": 3,
    "strings": [
      "\n    <section>\n      <strong>工作区</strong>\n      <div class=\"info-row\">\n        <span>名称</span>\n        <span>",
      "</span>\n      </div>\n      <div class=\"info-row\">\n        <span>路径</span>\n        <span class=\"info-path\">",
      "</span>\n        ",
      "\n      </div>\n    </section>\n  "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "infoInternals.viewer_info_status_flex_auto_min_height.0971f282": {
    "sourceHash": 150559135,
    "valueCount": 3,
    "strings": [
      "\n    <style>\n      .viewer.info-status { flex: 1 1 auto; min-height: 0; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; padding: 12px; font: 400 13px/18px var(--pi-font-family, system-ui, sans-serif); overflow-y: auto; overflow-x: hidden; }\n      .viewer.info-status section { flex: 0 0 auto; min-width: 0; display: grid; gap: 8px; align-content: start; }\n      .viewer.info-status p { margin: 0; }\n      .toolbar strong, .viewer.info-status section > strong, .info-component strong { font-weight: 500; }\n      .info-row { display: grid; grid-template-columns: minmax(90px, auto) minmax(0, 1fr); gap: 3px 10px; border-bottom: 0; padding: 6px 0; overflow-wrap: anywhere; }\n      .info-row small { grid-column: 1 / -1; color: var(--pi-muted); font-size: 12px; line-height: 16px; }\n      .info-component { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; border-bottom: 0; padding: 6px 0; }\n      .info-component small { grid-column: 1 / -1; color: var(--pi-muted); font-size: 12px; line-height: 16px; overflow-wrap: anywhere; }\n      .info-health-ok { color: var(--pi-success); }\n      .info-health-attention { color: var(--pi-warning); }\n    </style>\n    <section class=\"toolbar\"><strong>信息</strong></section>\n    <section class=\"viewer info-status\">\n      ",
      "\n      ",
      "\n      ",
      "\n    </section>\n  "
    ],
    "order": [
      0,
      1,
      2
    ]
  }
} as const;
