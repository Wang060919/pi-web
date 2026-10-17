---
"@jmfederico/pi-web": patch
---

Prevent concurrent file moves from overwriting existing destinations, move symbolic links without moving their targets, and reject escaping destination paths before creating directories.
