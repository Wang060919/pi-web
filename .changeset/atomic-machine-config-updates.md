---
"@jmfederico/pi-web": patch
---

Prevent concurrent remote machine settings updates from overwriting each other. Remote machines must support atomic configuration updates; older versions report an upgrade requirement instead of risking lost settings.
