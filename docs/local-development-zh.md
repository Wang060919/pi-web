# 本机隔离开发

在 Linux 上使用独立开发实例，可以保留日常使用的 Pi 和 pi-web 会话。开发页面位于 <http://127.0.0.1:8515>，API 位于 <http://127.0.0.1:8514>。

## 首次运行

在本仓库根目录安装依赖并构建，然后启动：

```sh
npm ci
npm run build
node scripts/dev-local.mjs start
node scripts/dev-local.mjs status
```

启动会检查两个端口是否空闲，并等待 API、sessiond 和 Vite 代理健康；最长等待 45 秒。端口被占用时会直接报告，原进程继续运行。依赖或构建缺失时，脚本会提示先完成构建。

本机使用 `npm ci --ignore-scripts` 安装时，需要另外构建仓库内的 `node-pty` 原生模块。已有 `/usr/include/node`、`node-gyp`、`make` 和 C++ 编译器时，可以执行 `node-gyp rebuild --nodedir=/usr --directory=node_modules/node-pty`，再完成项目构建。

关闭开发实例：

```sh
node scripts/dev-local.mjs stop
```

脚本将开发实例放在独立进程组，记录 owner PID、启动时间和随机标识。停止时会核对 Linux `/proc` 中的命令、工作目录、用户、启动时间和进程组，只有匹配的开发实例会收到停止信号。服务先获得正常退出的机会，超时后才会终止本实例。任一服务退出会关闭其余开发服务。脚本不设置开机自启动。

## 数据和凭据

开发数据全部保存在本仓库 `.local/dev/`，目录内的 `.gitignore` 会使这些运行数据保持在版本控制之外：

| 路径 | 用途 |
| --- | --- |
| `config.json` | 独立 pi-web 配置，首次创建为 `{}` |
| `state/` | 开发项目列表、机器列表和其他 pi-web 状态 |
| `agent/` | 独立 Pi 设置、包、模型配置和开发登录信息 |
| `sessions/` | 开发会话记录 |
| `instance.json` | 本脚本管理的进程归属记录 |
| `services.log` | API、sessiond、Vite 和管理进程日志 |

sessiond 的 Unix socket 使用系统临时目录下按用户和仓库路径区分的私有短目录，以避免仓库路径过长。停止后保留该空目录，便于再次启动。

启动环境只保留必要的用户、路径和终端变量，生产实例的 `PI_WEB_*` 覆盖、API Key、`NODE_OPTIONS` 和 `LD_LIBRARY_PATH` 不会传给开发服务。脚本不读取或复制现有 Pi 凭据，开发 profile 最初为空；如需模型实测，在开发页面中单独配置。`PI_WEB_OFFLINE=1` 和 `PI_OFFLINE=1` 会跳过后台网络刷新；显式发送提示词仍可调用已配置的模型。

首次启动可能在独立开发 profile 中登记随 pi-web 提供的 Relays 和 Workflows 包。开发项目列表从空列表开始。添加真实项目之后，开发实例仍可按你的操作修改该项目文件；数据隔离不等于文件系统沙箱。

## 修改代码

前端由 Vite 读取源码，沿用仓库关闭自动 HMR 的设置，修改后手动刷新浏览器。API、sessiond 和插件使用 `dist/` 中的构建产物，均不自动重启。修改后端或插件代码时，完成当前开发会话，再执行：

```sh
node scripts/dev-local.mjs stop
npm run build
node scripts/dev-local.mjs start
```

日常开发使用本脚本的三个命令。仓库原有 `npm run dev` 会启动另一个默认端口实例，并 watch sessiond，不适用于这套隔离环境。语言资源的维护方法见 [中英文界面语言](i18n-zh.md)，检查约定见 [开发与交付检查](development-checks.md)。

## 启动失败

先查看 `node scripts/dev-local.mjs status` 和 `.local/dev/services.log`。启动中按 Ctrl+C 会停止本次创建的实例。身份核对不符时，脚本会拒绝发送信号；应根据报告核实记录和进程，再处理遗留记录，避免按端口批量结束进程。运行数据会保留，供下次启动使用。
