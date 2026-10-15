// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "MermaidPreview.mermaid_could_not_render_this_source.ecb939e2": "Mermaid 无法渲染此源代码",
  "MermaidPreview.mermaid_preview_timed_out.be46c065": "Mermaid 预览超时"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {
  "MermaidPreview.mermaid_engine_unavailable.d87213b9": {
    "sourceHash": 2139704231,
    "valueCount": 1,
    "strings": [
      "Mermaid 引擎不可用（",
      "）"
    ],
    "order": [
      0
    ]
  },
  "MermaidPreview.rendering_diagram.9c9404d9": {
    "sourceHash": 4153109170,
    "valueCount": 0,
    "strings": [
      "<p role=\"status\">正在渲染图表…</p>"
    ],
    "order": []
  },
  "MermaidPreview.template.9967b04a": {
    "sourceHash": 3688574093,
    "valueCount": 2,
    "strings": [
      "<iframe title=\"Mermaid 图表\" sandbox=\"allow-scripts\" referrerpolicy=\"no-referrer\" .srcdoc=",
      " style=",
      "></iframe>"
    ],
    "order": [
      0,
      1
    ]
  }
} as const;
