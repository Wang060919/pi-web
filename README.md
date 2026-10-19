# PI WEB

[![CI](https://github.com/Wang060919/pi-web/actions/workflows/ci.yml/badge.svg?branch=codex%2Fpi-web-dev)](https://github.com/Wang060919/pi-web/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@wang060919/pi-web)](https://www.npmjs.com/package/@wang060919/pi-web)
[![Node.js](https://img.shields.io/node/v/@wang060919/pi-web)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**PI WEB is a web UI for [Pi Coding Agent](https://github.com/earendil-works/pi/tree/main/packages/coding-agent) that keeps agent sessions running in real workspaces on your machine or server.**

Run agents where your code, tools, credentials, and build caches live. Supervise multiple sessions from any browser, even after disconnecting.

This is Wang060919's customized distribution of [upstream PI WEB](https://github.com/jmfederico/pi-web), published as `@wang060919/pi-web`.

![PI WEB desktop screenshot](docs/assets/pi-web-desktop.png)

## Quick start

Requires Node.js 22.19.0+, npm, Pi Coding Agent 1.x configured for your user, git, and the development tools your agents need.

```bash
npm install -g @wang060919/pi-web --allow-scripts=node-pty
pi-web install
pi-web doctor
```

On npm 12, the scoped flag lets `node-pty` prepare its required native module.

Open <http://127.0.0.1:8504>. Add a project, choose a workspace or Git worktree, and start a session.

```bash
pi-web status
pi-web logs
pi-web restart
pi-web update
pi-web uninstall
```

For installation variants, Docker, and remote access, see the [installation guide](docs/install.html). See [independent distribution](docs/npm-release.md) for migration and release setup.

## Core model

- **Machine:** a local or remote PI WEB runtime.
- **Project:** a folder on that machine.
- **Workspace:** a working folder, such as a Git worktree.
- **Session:** a Pi Coding Agent conversation running in a workspace.

Use files, terminals, plugins, and agent workflows in one UI. Register remote machines to supervise work across a fleet.

## Security

PI WEB assumes trusted users, repositories, paths, and plugins. It is not a sandbox or a multi-tenant platform.

For remote access, use a trusted private network, VPN, SSH tunnel, or authenticated reverse proxy. Do not expose PI WEB directly to the public internet.

## Documentation

- [Install](docs/install.html)
- [Remote-first development](docs/remote-first.html)
- [Machines / fleet](docs/machines.html)
- [Configuration](docs/config.md)
- [Plugins](docs/plugins.md)
- [FAQ](docs/faq.html)

## Development

```bash
npm install
npm run dev
```

Open the Vite URL, usually <http://localhost:8505>. See [development checks](docs/development-checks.md) for verification guidance.

## License

MIT © 2026 Federico Jaramillo Martinez. See [LICENSE](LICENSE).
