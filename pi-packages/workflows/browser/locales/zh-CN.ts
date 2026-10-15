// Simplified Chinese UI messages; dynamic values remain untouched.
import type { messages as englishMessages } from './en.js';

export const messages: Record<keyof typeof englishMessages, string> = {
  "pi-web-plugin.create_worktree.46433ba1": "创建工作树",
  "pi-web-plugin.prepare_worktree_describe_its_purpose_and_or.1ed5b8ff": "准备 /worktree；发送前请描述用途或指定基础分支",
  "pi-web-plugin.workflows.8abe73c8": "工作流",
  "pi-web-plugin.select_an_active_conversation_in_chat_with.784472bd": "请先在“聊天”中选择活动对话，并清空输入框。"
};

// strings contain static template text; order refers to the original value positions.
export const templates = {} as const;
