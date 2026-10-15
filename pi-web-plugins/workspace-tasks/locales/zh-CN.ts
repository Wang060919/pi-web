// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "config.config_must_be_an_object.a502c2a1": "配置必须是对象",
  "config.config_version_must_be.c9ea4630": "配置的 version 必须为 1",
  "config.config_tasks_must_be_an_array.aa8a6700": "配置的 tasks 必须是数组",
  "pi-web-plugin.open_workspace_tasks.e436de67": "打开工作区任务",
  "pi-web-plugin.workspace.9a4c0efe": "工作区",
  "pi-web-plugin.tasks.db35526f": "任务",
  "tasksPanelElement.that_task_is_no_longer_available_click.8300c61e": "该任务已不可用。请点击“刷新”后重试。",
  "tasksPanelElement.another_task_is_already_starting_wait_for.00962e8d": "另一个任务正在启动。请等待其启动完成后重试。",
  "tasksPanelElement.select_a_workspace_before_opening_a_terminal.a528e377": "请先选择工作区，再打开终端。",
  "tasksPanelElement.dispatching.93fc59b6": "正在启动…",
  "tasksPanelElement.run.cf138a75": "运行",
  "workspaceTasksClient.no_workspace_tasks_configured_here.09a35f90": "此工作区尚未配置任务。",
  "workspaceTasksClient.could_not_load_workspace_tasks.c4848149": "无法加载工作区任务。"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "config.invalid_json.ed35f616": {
    "sourceHash": 1399491778,
    "valueCount": 1,
    "strings": [
      "JSON 无效：",
      ""
    ],
    "order": [
      0
    ]
  },
  "config.duplicate_task_id.7608c8c0": {
    "sourceHash": 188899190,
    "valueCount": 1,
    "strings": [
      "任务 id 重复：",
      ""
    ],
    "order": [
      0
    ]
  },
  "config.task.b1aad192": {
    "sourceHash": 4035496172,
    "valueCount": 1,
    "strings": [
      "任务 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "config.must_be_an_object.b75bb5f5": {
    "sourceHash": 3480887245,
    "valueCount": 1,
    "strings": [
      "",
      " 必须是对象"
    ],
    "order": [
      0
    ]
  },
  "config.id_must_match.6cba10a1": {
    "sourceHash": 1005322138,
    "valueCount": 2,
    "strings": [
      "",
      " 的 id 必须匹配 ",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "config.confirm_must_be_a_boolean.234a294d": {
    "sourceHash": 837098076,
    "valueCount": 1,
    "strings": [
      "",
      " 的 confirm 必须是布尔值"
    ],
    "order": [
      0
    ]
  },
  "config.must_be_a_non_empty_string.d06daa97": {
    "sourceHash": 299023758,
    "valueCount": 2,
    "strings": [
      "",
      " 的 ",
      " 必须是非空字符串"
    ],
    "order": [
      0,
      1
    ]
  },
  "config.must_be_a_non_empty_string_when.d54ea958": {
    "sourceHash": 3222586433,
    "valueCount": 2,
    "strings": [
      "",
      " 的 ",
      " 若提供，必须是非空字符串"
    ],
    "order": [
      0,
      1
    ]
  },
  "pi-web-plugin.open_the_workspace_tasks_tab_configure_tasks.9030dc94": {
    "sourceHash": 454141567,
    "valueCount": 1,
    "strings": [
      "打开工作区的“任务”选项卡。在 ",
      " 中配置任务。"
    ],
    "order": [
      0
    ]
  },
  "tasksPanelElement.select_a_workspace.edd74da4": {
    "sourceHash": 438393582,
    "valueCount": 1,
    "strings": [
      "",
      "<section class=\"empty\">请选择工作区。</section>"
    ],
    "order": [
      0
    ]
  },
  "tasksPanelElement.workspace_tasks_refresh_open_terminal.d546a107": {
    "sourceHash": 180546515,
    "valueCount": 4,
    "strings": [
      "\n      ",
      "\n      <section class=\"toolbar\">\n        <strong>工作区任务</strong>\n        <span class=\"toolbar-tasks\">\n          <button class=\"secondary\" data-refresh-config ",
      ">刷新</button>\n          <button class=\"secondary\" data-open-terminal>打开终端</button>\n        </span>\n      </section>\n      ",
      "\n      <section class=\"viewer tasks-viewer\">\n        ",
      "\n      </section>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "tasksPanelElement.loading.13100637": {
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
  "tasksPanelElement.no_tasks_are_defined_in_add_tasks.ea10d421": {
    "sourceHash": 1214049304,
    "valueCount": 1,
    "strings": [
      "<p class=\"muted\">",
      " 中尚未定义任务。请在文件中添加任务，然后点击“刷新”。</p>"
    ],
    "order": [
      0
    ]
  },
  "tasksPanelElement.tasks_run_in_a_dedicated_workspace_terminal.953e5cca": {
    "sourceHash": 373724184,
    "valueCount": 2,
    "strings": [
      "\n      <p class=\"muted\">任务将在专用工作区终端中运行，并切换到该终端。编辑 ",
      " 后，点击“刷新”重新加载。</p>\n      ",
      "\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "tasksPanelElement.refreshing.40a8d9d0": {
    "sourceHash": 118541520,
    "valueCount": 1,
    "strings": [
      "正在刷新 ",
      "…"
    ],
    "order": [
      0
    ]
  },
  "tasksPanelElement.loaded_task.314f60f6": {
    "sourceHash": 1517853061,
    "valueCount": 2,
    "strings": [
      "已加载 ",
      " 个任务。"
    ],
    "order": [
      0
    ]
  },
  "tasksPanelElement.run.b1efe9c1": {
    "sourceHash": 4050608007,
    "valueCount": 2,
    "strings": [
      "运行 ",
      "？\n\n",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "tasksPanelElement.cancelled.8fdfb99b": {
    "sourceHash": 3067744434,
    "valueCount": 1,
    "strings": [
      "已取消 ",
      "。"
    ],
    "order": [
      0
    ]
  },
  "tasksPanelElement.starting.0aa80c4e": {
    "sourceHash": 175086599,
    "valueCount": 1,
    "strings": [
      "正在启动 ",
      "…"
    ],
    "order": [
      0
    ]
  },
  "tasksPanelElement.started_terminal_command.89f04ff2": {
    "sourceHash": 2613227644,
    "valueCount": 1,
    "strings": [
      "已启动终端命令“",
      "”。"
    ],
    "order": [
      0
    ]
  },
  "workspaceTasksClient.is_optional_create_it_in_this_workspace.892b9b71": {
    "sourceHash": 822171169,
    "valueCount": 1,
    "strings": [
      "",
      " 为可选配置。若要使用自定义任务，请在此工作区中创建该文件。"
    ],
    "order": [
      0
    ]
  },
  "workspaceTasksClient.fix_then_click_refresh.e0b17ea2": {
    "sourceHash": 2349154182,
    "valueCount": 1,
    "strings": [
      "请修正 ",
      "，然后点击“刷新”。"
    ],
    "order": [
      0
    ]
  },
  "workspaceTasksClient.unable_to_read.9272abf3": {
    "sourceHash": 1159494107,
    "valueCount": 2,
    "strings": [
      "无法读取 ",
      "：",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "workspaceTasksClient.must_be_a_text_file.93f312bf": {
    "sourceHash": 2643273359,
    "valueCount": 1,
    "strings": [
      "",
      " 必须是文本文件"
    ],
    "order": [
      0
    ]
  },
  "workspaceTasksClient.is_too_large_and_was_truncated.cf746f11": {
    "sourceHash": 2916629570,
    "valueCount": 1,
    "strings": [
      "",
      " 过大，已被截断"
    ],
    "order": [
      0
    ]
  }
} as const;
