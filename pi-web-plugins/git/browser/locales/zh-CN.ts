// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "git-panel.go_to_git.1aa66d38": "转到 Git",
  "git-panel.navigation.d531b051": "导航",
  "git-panel.refresh_git.32dc02ee": "刷新 Git",
  "git-panel.workspace.e1170fe3": "工作区",
  "git-panel.git_workspace_backend_is_unavailable_update_and.4b844c50": "Git 工作区后端不可用。请更新并重启此计算机上的 PI WEB，然后重新加载浏览器。",
  "git-panel.list.0c8ac4a7": "列表",
  "git-panel.tree.2ff90d78": "树状",
  "git-panel.collapse_all.33257fda": "全部折叠",
  "git-panel.expand_all.80870856": "全部展开",
  "git-panel.loading_status.efadf79d": "正在加载状态…",
  "git-panel.status_unavailable.494e2de1": "状态不可用。",
  "git-panel.diff.39fa7be8": "差异",
  "git-panel.staged.799f88c7": "已暂存",
  "git-panel.unstaged.a20e288f": "未暂存",
  "git-panel.truncated.00ce90c9": " · 已截断",
  "git-panel.detached.968daf6c": "分离 HEAD",
  "gitFileShared.commit.21699918": "提交"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "git-panel.git_refresh.8261b233": {
    "sourceHash": 3849837423,
    "valueCount": 11,
    "strings": [
      "\n    <section class=\"git-panel\">\n      <style .textContent=",
      "></style>\n      <pi-web-git-panel-activity .controller=",
      " .context=",
      "></pi-web-git-panel-activity>\n      <section class=\"git-toolbar\">\n        <strong>Git</strong>\n        ",
      "\n        <div class=\"git-toolbar-actions\">\n          ",
      "\n          ",
      "\n          <button type=\"button\" ?disabled=",
      " @click=",
      ">刷新</button>\n        </div>\n      </section>\n      ",
      "\n      <section class=\"git-split\">\n        <div class=\"git-file-list\">",
      "</div>\n        <div class=\"git-viewer\">",
      "</div>\n      </section>\n    </section>\n  "
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
  "git-panel.stale.223f42f5": {
    "sourceHash": 1113117074,
    "valueCount": 0,
    "strings": [
      "<span class=\"git-stale\">待刷新</span>"
    ],
    "order": []
  },
  "git-panel.template.3f19f4d9": {
    "sourceHash": 3046484973,
    "valueCount": 2,
    "strings": [
      "\n    <div class=\"git-view-toggle\" role=\"group\" aria-label=\"变更文件视图\">\n      ",
      "\n      ",
      "\n    </div>\n  "
    ],
    "order": [
      0,
      1
    ]
  },
  "git-panel.not_a_git_repository.6736b532": {
    "sourceHash": 741306727,
    "valueCount": 0,
    "strings": [
      "<p class=\"git-muted\">此目录不是 Git 仓库。</p>"
    ],
    "order": []
  },
  "git-panel.no_changes.216a9e6d": {
    "sourceHash": 1141269155,
    "valueCount": 1,
    "strings": [
      "",
      "<p class=\"git-muted\">没有变更。</p>"
    ],
    "order": [
      0
    ]
  },
  "git-panel.select_a_changed_file.c8388354": {
    "sourceHash": 3959745510,
    "valueCount": 0,
    "strings": [
      "<p class=\"git-muted\">请选择一个有变更的文件。</p>"
    ],
    "order": []
  },
  "git-panel.loading_diff.b7f5df15": {
    "sourceHash": 458948788,
    "valueCount": 0,
    "strings": [
      "<p class=\"git-muted\">正在加载差异…</p>"
    ],
    "order": []
  },
  "git-panel.no_staged_or_unstaged_diff.74a0d729": {
    "sourceHash": 1466334377,
    "valueCount": 0,
    "strings": [
      "<p class=\"git-muted\">没有已暂存或未暂存的差异。</p>"
    ],
    "order": []
  },
  "git-panel.no_diff.fa2abfbc": {
    "sourceHash": 3180389961,
    "valueCount": 0,
    "strings": [
      "<p class=\"git-muted\">没有差异。</p>"
    ],
    "order": []
  },
  "git-panel.template.4451727a": {
    "sourceHash": 1547987368,
    "valueCount": 1,
    "strings": [
      "\n        <div class=\"git-diff-scroller\">\n          <div class=\"git-diff-grid\" role=\"table\" aria-label=\"统一差异\">\n            ",
      "\n          </div>\n        </div>\n      "
    ],
    "order": [
      0
    ]
  },
  "git-panel.submodule.08eea8be": {
    "sourceHash": 1032920975,
    "valueCount": 0,
    "strings": [
      "<span class=\"submodule-badge\">子模块</span>"
    ],
    "order": []
  }
} as const;
