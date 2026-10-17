# Workspace token usage

Select the Pi mark in the sidebar, or search for **Workspace overview**, to open the welcome page for the selected workspace. The overview works in both light and dark themes. Opening a conversation returns to its chat; opening the overview does not stop that conversation's Pi runtime.

The panel reads persisted history from the selected machine's active agent profile. It includes active sessions and readable archived sessions belonging to the same profile and workspace. Use **Refresh** to include new activity. The panel does not scan in the background while a conversation is open.

## Counts and dates

- **Sessions** counts persisted sessions by their creation date. A session active on several days is counted once.
- **Messages** counts persisted message entries, including tool results. An independent usage record or a compaction summary adds token usage without adding a message.
- **Total tokens** adds input, output, cache-read and cache-write tokens. Reasoning and cache-lifetime breakdowns are already included in those categories.
- **Active days** counts days with session creation, messages or token usage. **Peak hour** uses message activity. **Favorite model** is the model with the most tokens in the selected period; tools and summaries have a separate usage bucket.
- Message and token dates follow their original event timestamps in the browser's reporting time zone. Forked copies retain their original dates and are counted once.

The **7d** and **30d** ranges include today. **All** includes all readable history; the heatmap always shows the latest 26 weeks. Hover, tap or focus a day to see its token breakdown. Arrow keys move between dates, Home/End move to the first/last date, and Escape dismisses the tooltip.

These totals represent persisted usage, rather than a provider's billing or subscription quota. The current conversation's context ring measures current context occupancy separately.

## Incomplete history

Unavailable history shows an error with a retry action. Missing archives, malformed records, oversized files and legacy entries without stable IDs produce an incomplete-history notice. Such records can prevent exact totals or branch deduplication. Permanently deleted transcripts cannot be reconstructed.

The session daemon reads its own session-directory settings and archive store. After upgrading from a version without usage statistics, restart the session daemon when it is safe to interrupt its active sessions; restarting only the web UI leaves statistics unavailable until the daemon is updated too.

The API returns only daily aggregates, without message text, file paths or credentials. Reading statistics does not create, resume or rewrite a Pi session.
