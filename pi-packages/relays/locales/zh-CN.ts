// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "markdownDocument.table.0ff621f4": "表格",
  "pi-web-plugin.open_workspace_relays.2c9391ea": "打开工作区接力任务",
  "pi-web-plugin.workspace.cbb6ea13": "工作区",
  "pi-web-plugin.relays.45cf24d0": "接力任务",
  "relaysPanelElement.contains_the_open_document.f7e4f9e0": "包含当前打开的文档",
  "relaysPanelElement.could_not_scan_workspace_relays.1dd616a9": "无法扫描工作区接力任务。",
  "relaysPanelElement.could_not_list_this_relay_s_documents.94208d5d": "无法列出此接力任务的文档。",
  "relaysPanelElement.could_not_read_this_document.7d544b41": "无法读取此文档。"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "pi-web-plugin.open_the_workspace_relays_tab_relays_live.46197c57": {
    "sourceHash": 2001228913,
    "valueCount": 1,
    "strings": [
      "打开工作区的“接力任务”选项卡。接力文件位于 ",
      "。"
    ],
    "order": [
      0
    ]
  },
  "pi-web-plugin.relay.53f89c7a": {
    "sourceHash": 1368182892,
    "valueCount": 3,
    "strings": [
      "\n                  <button\n                    type=\"button\"\n                    style=\"border:0; padding:0; background:transparent; color:var(--pi-accent); font:inherit; text-align:start; overflow-wrap:anywhere; cursor:pointer\"\n                    title=",
      "\n                    aria-label=",
      "\n                    @click=",
      "\n                  >接力</button>\n                "
    ],
    "order": [
      0,
      1,
      2
    ]
  },
  "pi-web-plugin.open_relay_leg.649d4da0": {
    "sourceHash": 285967982,
    "valueCount": 2,
    "strings": [
      "打开接力任务 ",
      "，阶段 ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "relaysPanelElement.select_a_workspace.fc7af65c": {
    "sourceHash": 4267596777,
    "valueCount": 1,
    "strings": [
      "\n      ",
      "\n      <section class=\"toolbar\" hidden></section>\n      <nav class=\"document-tabs\" aria-label=\"接力文档\" hidden></nav>\n      <section class=\"viewer\"><div class=\"empty\">请选择工作区。</div></section>\n    "
    ],
    "order": [
      0
    ]
  },
  "relaysPanelElement.relays.51c6f97c": {
    "sourceHash": 3498640551,
    "valueCount": 2,
    "strings": [
      "\n      <strong>接力任务</strong>\n      <span class=\"toolbar-actions\">\n        ",
      "\n        <button class=\"icon-button\" data-refresh aria-label=\"刷新\" title=\"刷新\">",
      "</button>\n      </span>\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "relaysPanelElement.template.72bbc8aa": {
    "sourceHash": 3597872649,
    "valueCount": 1,
    "strings": [
      "<select data-relay-picker aria-label=\"接力任务\">",
      "</select>"
    ],
    "order": [
      0
    ]
  },
  "relaysPanelElement.select_a_workspace.ba41ce2e": {
    "sourceHash": 1337100482,
    "valueCount": 0,
    "strings": [
      "<div class=\"empty\">请选择工作区。</div>"
    ],
    "order": []
  },
  "relaysPanelElement.scanning.c2a87b77": {
    "sourceHash": 2975460457,
    "valueCount": 1,
    "strings": [
      "<p class=\"muted\">正在扫描 ",
      "…</p>"
    ],
    "order": [
      0
    ]
  },
  "relaysPanelElement.loading_relay_documents.655891d2": {
    "sourceHash": 1717953373,
    "valueCount": 0,
    "strings": [
      "<p class=\"muted\">正在加载接力文档…</p>"
    ],
    "order": []
  },
  "relaysPanelElement.this_relay_no_longer_exists_click_refresh.ed38e570": {
    "sourceHash": 292108439,
    "valueCount": 1,
    "strings": [
      "<div class=\"empty-state\"><strong>此接力任务已不存在。</strong><p>点击“刷新”重新扫描 ",
      "。</p></div>"
    ],
    "order": [
      0
    ]
  },
  "relaysPanelElement.some_nested_content_is_not_listed_this.7a91f140": {
    "sourceHash": 4220983804,
    "valueCount": 0,
    "strings": [
      "<div class=\"status info\">部分嵌套内容未列出 — 此接力目录的深度或大小超出面板显示范围。</div>"
    ],
    "order": []
  },
  "relaysPanelElement.this_relay_has_no_documents_yet_relay.55181019": {
    "sourceHash": 3991254941,
    "valueCount": 1,
    "strings": [
      "",
      "\n        <div class=\"empty-state\">\n          <strong>此接力任务尚无文档。</strong>\n          <p>接力资料包含 <code>charter.md</code>（目标）、<code>status.md</code>（当前交接内容）和 <code>log.md</code>（历史记录）。可选的 <code>decisions.md</code> 用于记录重要决策及其原因。</p>\n        </div>\n      "
    ],
    "order": [
      0
    ]
  },
  "relaysPanelElement.select_a_document.d9c30fae": {
    "sourceHash": 2645780040,
    "valueCount": 0,
    "strings": [
      "<p class=\"muted\">请选择文档。</p>"
    ],
    "order": []
  },
  "relaysPanelElement.loading.03b9f108": {
    "sourceHash": 135222824,
    "valueCount": 1,
    "strings": [
      "<p class=\"muted\">正在加载 ",
      "…</p>"
    ],
    "order": [
      0
    ]
  },
  "relaysPanelElement.this_document_no_longer_exists_click_refresh.618eb479": {
    "sourceHash": 4065245257,
    "valueCount": 0,
    "strings": [
      "<div class=\"empty-state\"><strong>此文档已不存在。</strong><p>点击“刷新”重新扫描此接力任务。</p></div>"
    ],
    "order": []
  },
  "relaysPanelElement.binary_file_binary_documents_have_no_text.53b85155": {
    "sourceHash": 1758445654,
    "valueCount": 1,
    "strings": [
      "<div class=\"empty-state\"><strong>二进制文件：",
      "</strong><p>二进制文档无法显示文本预览。</p></div>"
    ],
    "order": [
      0
    ]
  },
  "relaysPanelElement.this_document_is_truncated_only_the_beginning.f5a765b2": {
    "sourceHash": 633309249,
    "valueCount": 0,
    "strings": [
      "<div class=\"status info\">此文档已被截断 — 仅显示开头部分。</div>"
    ],
    "order": []
  },
  "relaysPanelElement.no_relays_in_this_workspace_relay_packets.62a42af7": {
    "sourceHash": 4083981694,
    "valueCount": 1,
    "strings": [
      "\n    <div class=\"empty-state\">\n      <strong>此工作区暂无接力任务。</strong>\n      <p>接力资料位于 <code>",
      "/&lt;name&gt;/</code>。此工作区尚未创建接力任务。</p>\n    </div>\n  "
    ],
    "order": [
      0
    ]
  }
} as const;
