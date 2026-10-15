// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "TerminalPanel.cancel_sent.cf3b8bfb": "已发送取消请求…",
  "TerminalPanel.cancel_command.7d5376cf": "取消命令",
  "TerminalPanel.starting_shell.92fc7e2f": "正在启动 Shell…",
  "TerminalPanel.continue_in_shell.92e99303": "继续使用 Shell",
  "TerminalPanel.no_terminal_output_to_copy.db7d49ea": "没有可复制的终端输出。",
  "TerminalPanel.copied_all_terminal_output.cbf3dc95": "已复制全部终端输出。",
  "TerminalPanel.unable_to_copy_terminal_output.275c2c60": "无法复制终端输出。",
  "TerminalPanel.return_to_the_interactive_terminal.c30a2060": "返回交互式终端",
  "TerminalPanel.select_and_copy_terminal_output.5cc46b65": "选择并复制终端输出",
  "TerminalPanel.close_terminal_copy_mode.3f9da222": "关闭终端复制模式",
  "TerminalPanel.open_terminal_copy_mode.fec0a012": "打开终端复制模式",
  "TerminalPanel.done.30172af5": "完成",
  "TerminalPanel.select.1fa059d0": "选择",
  "TerminalPanel.snapshot_long_press_and_select_text.502dd978": "快照 · 长按选择文本",
  "TerminalPanel.hide_terminal_soft_keys.36945f31": "隐藏终端软键盘",
  "TerminalPanel.show_terminal_soft_keys.ee2e331e": "显示终端软键盘",
  "TerminalPanel.hide_terminal_soft_keys.3e651527": "隐藏终端软键盘",
  "TerminalPanel.show_terminal_soft_keys.7fae8d06": "显示终端软键盘",
  "TerminalPanel.exited.29e1f98a": " · 已退出",
  "pi-web-plugin.terminal.a679d665": "终端",
  "pi-web-plugin.go_to_terminal.63a3cc0b": "转到终端",
  "pi-web-plugin.navigation.a3747f18": "导航",
  "terminalKeys.send_escape.b637b731": "发送 Esc",
  "terminalKeys.send_tab.efc35787": "发送 Tab",
  "terminalKeys.interrupt_the_foreground_process.67d92232": "中断前台进程",
  "terminalKeys.send_eof_close_input.1d24c924": "发送 EOF / 关闭输入",
  "terminalKeys.suspend_the_foreground_process.c041aebe": "挂起前台进程",
  "terminalKeys.clear_redraw_the_terminal.f961b6d2": "清空 / 重绘终端",
  "terminalKeys.reverse_search_history.064d1bdf": "反向搜索历史记录",
  "terminalKeys.delete_to_the_start_of_the_line.ac52f80f": "删除到行首",
  "terminalKeys.delete_the_previous_word.37bc1a1e": "删除上一个单词",
  "terminalKeys.left_arrow.90a989bb": "左方向键",
  "terminalKeys.move_left.cfcdde98": "向左移动",
  "terminalKeys.up_arrow.8c7741bb": "上方向键",
  "terminalKeys.move_up_previous_command.43d1b134": "向上移动 / 上一条命令",
  "terminalKeys.down_arrow.1f34a5c1": "下方向键",
  "terminalKeys.move_down_next_command.b441d674": "向下移动 / 下一条命令",
  "terminalKeys.right_arrow.bf49499d": "右方向键",
  "terminalKeys.move_right.711b6efe": "向右移动",
  "terminalKeys.move_to_the_start.da060867": "移动到开头",
  "terminalKeys.move_to_the_end.62c6d9fa": "移动到末尾",
  "terminalKeys.page_up.d23d8249": "向上翻页",
  "terminalKeys.page_up.1c62b44a": "向上翻页",
  "terminalKeys.page_down.a9f0a608": "向下翻页",
  "terminalKeys.page_down.d5c3a494": "向下翻页",
  "terminalKeys.delete.9755d175": "删除键",
  "terminalKeys.delete_forward.62e6e4f4": "向前删除",
  "terminalKeys.backspace.6edf6eef": "退格键",
  "terminalKeys.backspace.4863bc7f": "退格",
  "terminalKeys.move_backward_one_word.86571e3e": "向后移动一个单词",
  "terminalKeys.move_forward_one_word.7be9e6f7": "向前移动一个单词"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "TerminalPanel.terminal_connection_failed.b654e73f": {
    "sourceHash": 4162536628,
    "valueCount": 1,
    "strings": [
      "终端连接失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "TerminalPanel.terminal_connection_closed.bd174d90": {
    "sourceHash": 4208948167,
    "valueCount": 1,
    "strings": [
      "终端连接已关闭：",
      ""
    ],
    "order": [
      0
    ]
  },
  "TerminalPanel.terminal_send_failed.5f76c7e1": {
    "sourceHash": 2835734974,
    "valueCount": 1,
    "strings": [
      "终端发送失败：",
      ""
    ],
    "order": [
      0
    ]
  },
  "TerminalPanel.command_is_running_press_ctrl_c_or.08636c3c": {
    "sourceHash": 1988984786,
    "valueCount": 5,
    "strings": [
      "\n        <section class=\"command-run-notice running\">\n          <div>\n            <strong>",
      "</strong>\n            <p>命令正在运行。按 <kbd>Ctrl</kbd>+<kbd>C</kbd> 或点击按钮取消。</p>\n            <code>",
      "</code>\n          </div>\n          <button class=\"danger\" ?disabled=",
      " @click=",
      ">",
      "</button>\n        </section>\n      "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "TerminalPanel.output_is_preserved_continue_in_a_shell.7e1b7f3a": {
    "sourceHash": 346832317,
    "valueCount": 6,
    "strings": [
      "\n        <section class=",
      ">\n          <div>\n            <strong>",
      "</strong>\n            <p>输出已保留。可继续在 Shell 中查看或运行后续命令。</p>\n            <code>",
      "</code>\n          </div>\n          <button ?disabled=",
      " @click=",
      ">",
      "</button>\n        </section>\n      "
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
  "TerminalPanel.refresh_copy_all.e4c884f2": {
    "sourceHash": 1227456536,
    "valueCount": 5,
    "strings": [
      "\n      <div class=\"terminal-copy-toolbar\" role=\"toolbar\" aria-label=\"终端复制控件\">\n        <span aria-live=\"polite\">",
      "</span>\n        <small>",
      " 行</small>\n        <button type=\"button\" @click=",
      ">刷新</button>\n        <button type=\"button\" @click=",
      ">全部复制</button>\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      3,
      4
    ]
  },
  "TerminalPanel.template.c5d0a7c0": {
    "sourceHash": 3310208676,
    "valueCount": 4,
    "strings": [
      "\n      <section class=\"terminal-copy-view\" aria-label=\"终端复制模式\">\n        ",
      "\n        <div class=\"terminal-copy-layers\">\n          <pre class=\"terminal-copy-content\" aria-hidden=\"true\">",
      "</pre>\n          <textarea\n            class=\"terminal-copy-selector\"\n            readonly\n            inputmode=\"none\"\n            wrap=\"soft\"\n            spellcheck=\"false\"\n            autocapitalize=\"off\"\n            autocomplete=\"off\"\n            aria-label=\"可选择的终端输出\"\n            .value=",
      "\n            @scroll=",
      "\n          ></textarea>\n        </div>\n      </section>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "TerminalPanel.keys.3b02e7bb": {
    "sourceHash": 4276455048,
    "valueCount": 5,
    "strings": [
      "\n      <button\n        type=\"button\"\n        class=",
      "\n        title=",
      "\n        aria-label=",
      "\n        aria-pressed=",
      "\n        @click=",
      "\n      >\n        <svg class=\"keyboard-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\">\n          <rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"></rect>\n          <path d=\"M7 9h.01M10 9h.01M13 9h.01M16 9h.01M7 12h.01M10 12h.01M13 12h.01M16 12h.01M8 16h8\"></path>\n        </svg>\n        <span>按键</span>\n      </button>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3,
      4
    ]
  },
  "TerminalPanel.shell.e180687e": {
    "sourceHash": 630280324,
    "valueCount": 13,
    "strings": [
      "\n      <section class=\"terminal-shell\">\n        <div class=\"terminal-tabs\">\n          ",
      "\n          ",
      "\n          ",
      "\n          <button class=\"new\" ?disabled=",
      " @click=",
      ">+ 新建 Shell</button>\n        </div>\n        ",
      "\n        ",
      "\n        ",
      "\n        ",
      "\n        ",
      "\n        <div class=\"terminal-stage\">\n          <div class=",
      " ?inert=",
      "></div>\n          ",
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
  "TerminalPanel.loading_terminals.b2b8ff3e": {
    "sourceHash": 3616626987,
    "valueCount": 0,
    "strings": [
      "<p class=\"muted\">正在加载终端…</p>"
    ],
    "order": []
  },
  "TerminalPanel.command_succeeded.d5d5984e": {
    "sourceHash": 1262464757,
    "valueCount": 1,
    "strings": [
      "命令执行成功",
      ""
    ],
    "order": [
      0
    ]
  },
  "TerminalPanel.with_exit_code.139cb560": {
    "sourceHash": 420213908,
    "valueCount": 1,
    "strings": [
      "，退出码 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "TerminalPanel.command_failed.81dad9cc": {
    "sourceHash": 3976767835,
    "valueCount": 1,
    "strings": [
      "命令执行失败",
      ""
    ],
    "order": [
      0
    ]
  },
  "TerminalPanel.with_exit_code.834ed091": {
    "sourceHash": 420213908,
    "valueCount": 1,
    "strings": [
      "，退出码 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "TerminalSoftKeys.template.a03f8f6b": {
    "sourceHash": 229084426,
    "valueCount": 1,
    "strings": [
      "\n      <div class=\"terminal-soft-keys\" role=\"toolbar\" aria-label=\"终端软键盘\">\n        ",
      "\n      </div>\n    "
    ],
    "order": [
      0
    ]
  }
} as const;
