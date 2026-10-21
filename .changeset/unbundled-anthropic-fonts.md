---
"@wang060919/pi-web": patch
---

Use the Anthropic typefaces from the local operating-system font library and stop bundling their font files with the web client. Devices without those families use the existing local and system font fallbacks. The terminal keeps its bundled JetBrains Mono Nerd Font.
