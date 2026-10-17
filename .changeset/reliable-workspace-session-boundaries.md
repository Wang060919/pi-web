---
"@jmfederico/pi-web": patch
---

Prevent workspace file writes from following links outside the workspace, preserve concurrent machine changes, and apply remote JSON request timeouts through response completion.

Keep pending attachments with their original conversation, preserve existing settings when saving gateway options, and retain keyboard focus when pinning navigation items.

Read usage history through its owning session daemon, enforce file limits before scanning, reuse unchanged history, and recover usage refreshes after reconnecting the view. Restart the session daemon after updating to enable the usage endpoint.
