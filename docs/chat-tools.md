# Chat tools

These tools work with the selected machine and workspace. Settings for models and MCP servers are described in the [configuration reference](config.md#browser-model-and-mcp-management).

## Find and preserve conversations

- **Search saved messages:** use the search button beside the conversation list, or **Mod+Shift+F** (`Mod` is Ctrl or ⌘). Choose the current workspace or the selected machine. Search matches saved user and assistant text, including archived conversations and saved branches. A partial-results notice means limits or unreadable records left some history unsearched.
- **Read and locate a result:** selecting a search hit opens its original message in a read-only preview. **Locate in conversation** opens the conversation and tries to reveal the message, loading earlier history when needed. It does not switch the active branch; a message on another branch may remain available only in the preview.
- **Export HTML:** choose **Export session as HTML** in **Actions**, or send `/export` without attachments. The downloaded standalone file contains all saved branches and full records, with embedded images when present. It includes more than the currently displayed branch; review it before sharing. Oversized or malformed transcripts fail explicitly instead of producing a partial export.
- **Open files written during a turn:** the **Files written this turn** links collect paths from successful `write`, `edit`, and `apply_patch` tool results. Click a path to open it in Files. This is a record of those tools, not a Git diff or a complete list of changes made by shell commands, plugins, or other processes.

## Compose follow-ups

- **Ask about selected text:** select text in a chat message, then choose **Ask about selection** or **Ask in new session**. PI WEB appends a Markdown quote to the current composer's draft, or creates a new conversation in the current workspace and inserts it there. Add your question and send when ready. This does not rewind the source conversation to the selected message.
- **Reuse a prompt:** press **↑** in an empty composer to browse user prompts from the history currently loaded for that conversation. Use **↑/↓** to select, **Tab** or a click to insert, and **Esc** to close. The list does not search unloaded or other conversations.
- **Paste links from a webpage:** normal rich-text paste preserves webpage links as Markdown links. Plain-text paste and paste inside code keep their usual behavior; clipboard files and images follow the attachment flow.
- **Copy MCP JSON:** expand a tool result's **Details** and select **Copy original** to copy the original result text, including JSON punctuation and spacing, rather than the display summary. Copy appears when that text result is available.
- **Compress an image when useful:** each staged image offers **Original** and **Compressed** choices with a size comparison. Compression runs in the browser, scales large images to at most 2048 pixels on the longest side, and keeps the original if encoding would make the file larger. Switch back to **Original** before sending to restore it. GIF compression is disabled to preserve animation.

## Configure the runtime

- **Models:** open **Settings → Model configuration** to edit provider and model configuration, discover models to add to a draft, and test a draft before saving. Tests send a small real request. See [model configuration](config.md#model-configuration) for credential handling and when changes take effect.
- **MCP servers:** open **Settings → MCP servers** to manage global or project server definitions, enablement, connection tests, tool schemas, and supported HTTP OAuth flows. Trust and session reload rules apply; see [MCP management](config.md#mcp-server-management).
