# Independent npm distribution

This fork uses the public npm package name `@wang060919/pi-web` and the repository `Wang060919/pi-web`. It retains the `pi-web`, `pi-web-server`, and `pi-web-sessiond` commands, service names, and existing configuration and data directories. The original upstream license and attribution remain in `LICENSE`.

## Install or migrate

After the first npm release is published, new users can follow the [quick start](../README.md#quick-start). Until then, maintainers can share the checked local tarball produced by `npm pack --ignore-scripts` after building.

For an existing global upstream installation, finish active sessions and terminals before switching packages. Both packages provide the same command names, so remove the upstream package before installing this fork:

```sh
pi-web stop
npm uninstall -g @jmfederico/pi-web
npm install -g @wang060919/pi-web --allow-scripts=node-pty
pi-web install
pi-web doctor
```

Keep `~/.config/pi-web`, `~/.pi-web`, and the active Pi agent directory. They contain configuration, credentials, project registrations, and history; they are not part of the npm package. `pi-web install` reconfigures services to use the selected installation. Updates of this fork target `@wang060919/pi-web`, not the upstream npm package.

The GitHub repository is currently private. Public npm packages can still be installed without repository access. Raw GitHub installation links and source browsing require repository access while it remains private; use npm or a shared tarball for other users.

## Configure GitHub Actions publishing

Publishing runs only in `.github/workflows/publish.yml`, through a published GitHub Release or an explicit manual workflow run. Local `npm publish` is not used.

1. Confirm that the npm account or organization owns the `@wang060919` scope.
2. Create the GitHub environment `npm` in `Wang060919/pi-web`.
3. For a first release without an existing npm package/trusted publisher, store an npm granular publishing token as the `NPM_TOKEN` secret in that environment. Configure it with only the scope/package permissions required for this release and any publishing 2FA policy the account requires. Never commit the token or put it in release notes.
4. Once npm package settings are available, configure a [trusted publisher](https://docs.npmjs.com/trusted-publishers/) with GitHub owner `Wang060919`, repository `pi-web`, workflow filename `publish.yml`, and environment `npm`. After a successful OIDC release, remove the bootstrap token if it is no longer needed.

The workflow explicitly disables npm provenance for a private source repository, because npm does not support provenance from private repositories. It enables provenance if the repository is public. Repository visibility is a separate maintainer decision; the release workflow does not change it. This fork does not deploy the upstream `pi-web.dev` website.

## Prepare and publish a release

Use the working branch `codex/pi-web-dev`. Non-breaking releases use CalVer `MAJOR.YYYYMM.PATCH` with patch Changesets. Generate the release changelog with `npm run release:version`, then synchronize `package-lock.json` with `npm install --package-lock-only`.

Before publishing, require all of these checks to pass:

```sh
npm run verify
npm run build
npm run check:artifacts
npm run smoke:package-install
npm pack --dry-run --ignore-scripts
```

Review the tarball allowlist and confirm that local development data and credentials are excluded. Commit and push only the intended release changes when authorized, then publish a GitHub Release tagged `v<package.json version>` from that exact commit. The workflow checks that the tag and package version match before publication. A draft GitHub Release does not publish to npm.

After GitHub Actions succeeds, check the registry version and tarball:

```sh
npm view @wang060919/pi-web version
npm view @wang060919/pi-web@<version> dist.tarball
```
