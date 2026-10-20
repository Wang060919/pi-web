// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "FilesPanel.mention": "提及",
  "FilesPanel.mentionHint": "将路径插入聊天",
  "FilesPanel.mentionNeedsSession": "请先选择可编辑的会话，再提及路径",

  "FilesPanel.resize_file_list_and_preview": "调整文件列表与预览高度",
  "FilesPanel.drag_or_double_click_to_reset": "上下拖动调整高度，双击恢复默认。",
  "FilesPanel.workspace_root.a28d8001": "工作区根目录",
  "FilesPanel.choose_at_least_one_file_to_upload.6f017d64": "请至少选择一个要上传的文件。",
  "FilesPanel.done.3a797c59": "完成",
  "FilesPanel.failed.93770093": "失败",
  "FilesPanel.cancelled.25dfd907": "已取消",
  "FilesPanel.pending.11e52ad3": "等待中",
  "FilesPanel.done.9ebd0520": "完成",
  "FilesPanel.error.44175d7a": "错误",
  "FilesPanel.cancelled.91078e74": "已取消",
  "FilesRuntime.files_requires_workspace_files_capability_v_and.6ce2ef70": "文件功能需要 workspace-files v1 和 contribution navigation v1 能力。请更新 PI WEB 主机。",
  "FilesRuntime.workspace_upload_failed.214cedc7": "工作区上传失败",
  "FilesRuntime.not_uploaded.df9d2ff4": "未上传。",
  "FilesRuntime.upload_destination.3a279659": "上传目标",
  "FilesRuntime.upload_file_name.9bb72b7a": "上传文件名",
  "FilesRuntime.files_requires_workspace_files_capability_v_update.2c755021": "文件功能需要 workspace-files v1 能力。请更新 PI WEB 主机。",
  "FilesRuntime.files_requires_contribution_navigation_v_update_the.b52b3bd3": "文件功能需要 contribution navigation v1 能力。请更新 PI WEB 主机。",
  "FilesRuntime.upload_cancelled.86c12a42": "上传已取消",
  "FilesRuntime.upload_cancelled.c532161a": "上传已取消",
  "FilesViewer.select_a_file.0ddb16ac": "请选择文件。",
  "FilesViewer.this_file_is_empty.99030725": "此文件为空。",
  "FilesViewer.render.13e89f2f": "渲染",
  "FilesViewer.preview.3a18b1f0": "预览",
  "FilesViewer.this_file_is_empty.b3709031": "此文件为空。",
  "FilesViewer.markdown_preview_failed_use_raw_or_download.5f62df69": "Markdown 预览失败。请查看原文或下载文件。",
  "FilesViewer.truncated.7a1b9ece": " · 已截断",
  "pi-web-plugin.files.0f7e84cd": "文件",
  "pi-web-plugin.go_to_files.45406161": "转到文件",
  "pi-web-plugin.navigation.b81a6fb1": "导航",
  "pi-web-plugin.refresh_files.5f09df38": "刷新文件",
  "pi-web-plugin.workspace.70fd2ad5": "工作区",
  "workspaceMarkdown.image_omitted.2990eedc": "[已省略图片]",
  "workspaceMarkdown.table.30b0b0a6": "表格"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "FilesPanel.files_unavailable.63b15dff": {
    "sourceHash": 1110037271,
    "valueCount": 0,
    "strings": [
      "<p class=\"muted\">文件功能不可用。</p>"
    ],
    "order": []
  },
  "FilesPanel.files_is_unavailable_on_this_host.5486aef0": {
    "sourceHash": 1469103867,
    "valueCount": 1,
    "strings": [
      "\n        <section class=\"capability-error\" role=\"alert\">\n          <strong>此主机的文件功能不可用。</strong>\n          <span>",
      "</span>\n        </section>\n      "
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.files_requires_workspace_files_capability_v.89686927": {
    "sourceHash": 1259018620,
    "valueCount": 0,
    "strings": [
      "<p class=\"capability-error\" role=\"alert\">文件功能需要 workspace-files v1 能力。</p>"
    ],
    "order": []
  },
  "FilesPanel.files_upload_refresh_drop_files_to_upload.86aad454": {
    "sourceHash": 1173518456,
    "valueCount": 27,
    "strings": [
      "\n      <section\n        class=",
      "\n        @dragenter=",
      "\n        @dragover=",
      "\n        @dragleave=",
      "\n        @drop=",
      "\n      >\n        <section class=\"toolbar\">\n          <strong>文件</strong>\n          ",
      "\n          ",
      "\n          <div class=\"toolbar-actions\">\n            <button @click=",
      ">上传</button>\n            <button @click=",
      ">刷新</button>\n          </div>\n          <input id=\"workspace-upload-input\" class=\"visually-hidden\" type=\"file\" multiple @change=",
      " />\n        </section>\n        ",
      "\n        ",
      "\n        <section class=\"split\" style=",
      ">\n          <div class=\"list tree\" id=\"files-tree\">\n            ",
      "\n          </div>\n          ",
      "\n          <div class=\"viewer\">\n            <pi-web-files-viewer\n              .contentRendering=",
      "\n              .machineId=",
      "\n              .projectId=",
      "\n              .workspaceId=",
      "\n              .selectedPath=",
      "\n              .file=",
      "\n              .loadError=",
      "\n              .previewUrlBuilder=",
      "\n              .modeStore=",
      "\n              .maxInlinePreviewBytes=",
      "\n            ></pi-web-files-viewer>\n          </div>\n        </section>\n        <div class=\"drop-overlay\" aria-hidden=",
      ">\n          <div>\n            <strong>将文件拖到此处上传</strong>\n            <span>文件会立即上传到默认文件夹。</span>\n          </div>\n        </div>\n        ",
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
      26
    ]
  },
  "FilesPanel.loading.28330ace": {
    "sourceHash": 2066181550,
    "valueCount": 0,
    "strings": [
      "<span class=\"muted\">加载中…</span>"
    ],
    "order": []
  },
  "FilesPanel.stale.e70c7684": {
    "sourceHash": 2345696849,
    "valueCount": 0,
    "strings": [
      "<span class=\"stale\">待刷新</span>"
    ],
    "order": []
  },
  "FilesPanel.no_files_loaded.c8f2a390": {
    "sourceHash": 3222767731,
    "valueCount": 0,
    "strings": [
      "<p class=\"muted\">尚未加载文件。</p>"
    ],
    "order": []
  },
  "FilesPanel.uploads.d8a39c53": {
    "sourceHash": 2435067889,
    "valueCount": 2,
    "strings": [
      "\n      <section class=\"upload-progress\" aria-label=\"工作区上传\">\n        <div class=\"upload-progress-header\">\n          <strong>上传记录</strong>\n          <small>",
      "</small>\n        </div>\n        ",
      "\n      </section>\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "FilesPanel.cancel.6fcf7ba6": {
    "sourceHash": 2209323321,
    "valueCount": 1,
    "strings": [
      "<button @click=",
      ">取消</button>"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.dismiss.62780d9c": {
    "sourceHash": 2927929153,
    "valueCount": 1,
    "strings": [
      "<button @click=",
      ">关闭</button>"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.upload_review_destination_folder_workspace_relative_lea.0fd3495b": {
    "sourceHash": 3428599264,
    "valueCount": 18,
    "strings": [
      "\n      <dialog class=\"upload-dialog\" aria-label=\"确认文件上传\" @cancel=",
      " @close=",
      " @click=",
      ">\n        <header>\n          <div>\n            <span class=\"eyebrow\">上传</span>\n            <h2>确认上传 ",
      " 个文件</h2>\n          </div>\n          <button class=\"close-button\" type=\"button\" title=\"取消上传\" aria-label=\"取消上传\" @click=",
      ">",
      "</button>\n        </header>\n        <form @submit=",
      ">\n          <label>\n            <span>目标文件夹</span>\n            <input id=\"workspace-upload-destination\" autofocus .value=",
      " placeholder=",
      " @input=",
      " />\n            <small>相对于工作区的路径。留空则上传到工作区根目录。</small>\n          </label>\n          <div class=\"dialog-options\">\n            <label><input type=\"checkbox\" .checked=",
      " @change=",
      " /><span>创建父文件夹</span></label>\n            <label><input type=\"checkbox\" .checked=",
      " @change=",
      " /><span>覆盖已有文件</span></label>\n          </div>\n          <section class=\"review-files\" aria-label=\"待上传的文件\">\n            <strong>文件</strong>\n            ",
      "\n          </section>\n          ",
      "\n          <footer>\n            <button type=\"button\" @click=",
      ">取消</button>\n            <button type=\"submit\">上传</button>\n          </footer>\n        </form>\n      </dialog>\n    "
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
      15,
      16,
      17
    ]
  },
  "FilesPanel.unable_to_open_upload_review.25ce5d64": {
    "sourceHash": 2135179058,
    "valueCount": 1,
    "strings": [
      "无法打开上传确认：",
      ""
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.recent.00d2c624": {
    "sourceHash": 1336344014,
    "valueCount": 1,
    "strings": [
      "",
      " 条最近记录"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.uploading.6ca38b4d": {
    "sourceHash": 2639255810,
    "valueCount": 1,
    "strings": [
      "",
      " 项正在上传"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.uploaded.3666b55c": {
    "sourceHash": 2572881009,
    "valueCount": 2,
    "strings": [
      "已上传 ",
      " 个文件"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.upload_failed_for.8cd580d6": {
    "sourceHash": 3195212284,
    "valueCount": 2,
    "strings": [
      "",
      " 个文件上传失败"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.upload_cancelled_for.4ae83177": {
    "sourceHash": 2397304272,
    "valueCount": 2,
    "strings": [
      "已取消上传 ",
      " 个文件"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.uploading.c8c265cd": {
    "sourceHash": 3557762950,
    "valueCount": 2,
    "strings": [
      "正在上传 ",
      " 个文件"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.wrote.d4d34d2b": {
    "sourceHash": 2589301032,
    "valueCount": 1,
    "strings": [
      "已写入 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "FilesRuntime.files_failed_to_upload.bf848058": {
    "sourceHash": 4292193347,
    "valueCount": 1,
    "strings": [
      "",
      " 个文件上传失败"
    ],
    "order": [
      0
    ]
  },
  "FilesRuntime.must_not_be_empty.1ff7fb61": {
    "sourceHash": 1783301809,
    "valueCount": 1,
    "strings": [
      "",
      "不能为空"
    ],
    "order": [
      0
    ]
  },
  "FilesRuntime.must_be_workspace_relative.8883ff66": {
    "sourceHash": 947333911,
    "valueCount": 1,
    "strings": [
      "",
      "必须是相对于工作区的路径"
    ],
    "order": [
      0
    ]
  },
  "FilesRuntime.must_not_be_empty.f324a9b6": {
    "sourceHash": 1783301809,
    "valueCount": 1,
    "strings": [
      "",
      "不能为空"
    ],
    "order": [
      0
    ]
  },
  "FilesRuntime.must_not_contain_path_traversal.a39e7904": {
    "sourceHash": 3247060084,
    "valueCount": 1,
    "strings": [
      "",
      "不能包含上级目录跳转"
    ],
    "order": [
      0
    ]
  },
  "FilesViewer.unable_to_load.f5973e71": {
    "sourceHash": 1541393163,
    "valueCount": 2,
    "strings": [
      "无法加载 ",
      "：",
      ""
    ],
    "order": [
      0,
      1
    ]
  },
  "FilesViewer.loading.f1b8638d": {
    "sourceHash": 1163401591,
    "valueCount": 1,
    "strings": [
      "正在加载 ",
      "…"
    ],
    "order": [
      0
    ]
  },
  "FilesViewer.unable_to_preview_loaded_content_belongs_to.f8be05fa": {
    "sourceHash": 3374906738,
    "valueCount": 2,
    "strings": [
      "无法预览 ",
      "：已加载的内容属于 ",
      "。"
    ],
    "order": [
      0,
      1
    ]
  },
  "FilesViewer.download.12b4b7de": {
    "sourceHash": 3163117687,
    "valueCount": 9,
    "strings": [
      "\n      <div class=\"viewer-header\">\n        <strong title=",
      ">",
      "</strong>\n        <div class=\"viewer-actions\">\n          <small>",
      "</small>\n          ",
      "\n          ",
      "\n          ",
      "\n          <a class=\"viewer-action\" href=",
      " download=",
      " title=",
      ">下载</a>\n        </div>\n      </div>\n    "
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
  "FilesViewer.open.90a9b471": {
    "sourceHash": 1968818240,
    "valueCount": 2,
    "strings": [
      "\n            <a\n              class=\"viewer-action\"\n              href=",
      "\n              target=\"_blank\"\n              rel=\"noopener noreferrer\"\n              referrerpolicy=\"no-referrer\"\n              title=\"在新窗口中打开\"\n            >打开 ",
      "</a>\n          "
    ],
    "order": [
      0,
      1
    ]
  },
  "FilesViewer.download.b52b071b": {
    "sourceHash": 3515407077,
    "valueCount": 1,
    "strings": [
      "下载 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "FilesViewer.template.86beaf40": {
    "sourceHash": 367234139,
    "valueCount": 2,
    "strings": [
      "<select aria-label=\"文件渲染器\" @change=",
      ">\n      ",
      "\n    </select>"
    ],
    "order": [
      0,
      1
    ]
  },
  "FilesViewer.raw.cab99173": {
    "sourceHash": 1508192566,
    "valueCount": 6,
    "strings": [
      "\n      <div class=\"viewer-mode\" role=\"group\" aria-label=",
      ">\n        <button\n          type=\"button\"\n          aria-pressed=",
      "\n          @click=",
      "\n        >",
      "</button>\n        <button\n          type=\"button\"\n          aria-pressed=",
      "\n          @click=",
      "\n        >原文</button>\n      </div>\n    "
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
  "FilesViewer.view.f808185e": {
    "sourceHash": 2756880072,
    "valueCount": 1,
    "strings": [
      "查看 ",
      ""
    ],
    "order": [
      0
    ]
  },
  "FilesViewer.raw_source_is_truncated_use_download_for.246f667c": {
    "sourceHash": 2081986288,
    "valueCount": 0,
    "strings": [
      "<p class=\"preview-note\" role=\"status\">原文已截断。请下载完整文件。</p>"
    ],
    "order": []
  },
  "FilesViewer.preview_is_rendered_from_truncated_source_use.4c1ac256": {
    "sourceHash": 1065181811,
    "valueCount": 0,
    "strings": [
      "<p class=\"preview-note\" role=\"status\">预览基于截断的原文生成。请下载完整文件。</p>"
    ],
    "order": []
  },
  "FilesViewer.preview_of.4bd19724": {
    "sourceHash": 3795408596,
    "valueCount": 1,
    "strings": [
      "",
      " 的预览"
    ],
    "order": [
      0
    ]
  },
  "FilesViewer.inline_pdf_support_varies_by_browser_use.a047e904": {
    "sourceHash": 1349371940,
    "valueCount": 0,
    "strings": [
      "<p class=\"preview-note\" role=\"status\">浏览器对内嵌 PDF 的支持各不相同。如果文档未显示，请使用上方的“打开 ↗”或“下载”。</p>"
    ],
    "order": []
  },
  "FilesViewer.preview_of.4858ba64": {
    "sourceHash": 3795408596,
    "valueCount": 1,
    "strings": [
      "",
      " 的预览"
    ],
    "order": [
      0
    ]
  },
  "FilesViewer.preview_failed_for_open_it_in_a.d305fc12": {
    "sourceHash": 2554165695,
    "valueCount": 2,
    "strings": [
      "\n      <div class=\"preview-state\" role=\"alert\">\n        <strong>",
      " 预览失败。</strong>\n        <span>请在新窗口中打开，或使用上方的“下载”。</span>\n        <button type=\"button\" @click=",
      ">重试预览</button>\n      </div>\n    "
    ],
    "order": [
      0,
      1
    ]
  },
  "FilesViewer.preview_isn_t_available_for_this_file.a5785f87": {
    "sourceHash": 3557873996,
    "valueCount": 4,
    "strings": [
      "\n      <div class=\"preview-state\">\n        <p>此文件类型不支持预览。</p>\n        <a class=\"download-link\" href=",
      " download=",
      ">下载 ",
      " · ",
      "</a>\n      </div>\n    "
    ],
    "order": [
      0,
      1,
      2,
      3
    ]
  },
  "FilesViewer.file_too_large_to_preview_limit_use.03ae4703": {
    "sourceHash": 2692925601,
    "valueCount": 2,
    "strings": [
      "文件过大，无法预览：",
      " · 上限 ",
      "。请使用上方的“下载”。"
    ],
    "order": [
      0,
      1
    ]
  },
  "workspaceMarkdown.image_omitted.0d2a4b38": {
    "sourceHash": 2699838820,
    "valueCount": 1,
    "strings": [
      "[已省略图片：",
      "]"
    ],
    "order": [
      0
    ]
  },
  "FilesPanel.uploadReview": {
    "sourceHash": 179602129,
    "valueCount": 17,
    "strings": [
      "\n      <dialog class=\"upload-dialog\" aria-label=\"确认文件上传\" @cancel=",
      " @close=",
      " @click=",
      ">\n        <header>\n          <div>\n            <span class=\"eyebrow\">上传</span>\n            <h2>确认上传 ",
      " 个文件</h2>\n          </div>\n          <button class=\"close-button\" type=\"button\" title=\"取消上传\" aria-label=\"取消上传\" @click=",
      ">×</button>\n        </header>\n        <form @submit=",
      ">\n          <label>\n            <span>目标文件夹</span>\n            <input id=\"workspace-upload-destination\" autofocus .value=",
      " placeholder=",
      " @input=",
      " />\n            <small>相对于工作区的路径。留空则上传到工作区根目录。</small>\n          </label>\n          <div class=\"dialog-options\">\n            <label><input type=\"checkbox\" .checked=",
      " @change=",
      " /><span>创建父文件夹</span></label>\n            <label><input type=\"checkbox\" .checked=",
      " @change=",
      " /><span>覆盖已有文件</span></label>\n          </div>\n          <section class=\"review-files\" aria-label=\"待上传的文件\">\n            <strong>文件</strong>\n            ",
      "\n          </section>\n          ",
      "\n          <footer>\n            <button type=\"button\" @click=",
      ">取消</button>\n            <button type=\"submit\">上传</button>\n          </footer>\n        </form>\n      </dialog>\n    "
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
      14,
      15,
      16
    ]
  }
} as const;
