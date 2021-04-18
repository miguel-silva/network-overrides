# network-overrides

[![npm](https://img.shields.io/npm/v/network-overrides)](https://www.npmjs.com/package/network-overrides)

Via the combination of a [CLI](./core/README.md) and a [browser extension](./extension/README.md), define sets of browser-side redirects (overrides) programmatically from the command line.

It was designed to allow one to develop web client-side apps on top of an external environment (ex: test or production) using assets served from one (or multiple) local dev-server(s).

Additionally, by having the command line as a source of truth, one can ensure that a set of overrides are only in place while the related process is running (ex: dev-server).

## Quick start

1. Install npm package locally:

```sh
npm i network-overrides
```

2. Bootstrap a local dev-server, wrapped with overrides:

```sh
npx network-overrides wrap-command 'npx webpack serve' my-first-override '[{"from":"https://live-cdn\\.com/(.*)","to":"http://localhost:8080/$1"}]' --ensure-backend
```

<details>
  <summary>Command functionality</summary>
  <ol>
    <li>Ensure that the <strong>Network Overrides</strong> shared backend is running, which in turn will transmit the current overrides to the browser extension when necessary</li>
    <li>Add a single override which redirects assets from <code>https://live-cdn.com/</code> to the corresponding path under <code>http://localhost:8080/</code>. It belongs to an override set called <em>my-first-override</em></li>
    <li>Run <code>npx webpack serve</code> which will bootstrap the local webpack-dev-server</li>
    <li>Later, upon exiting, remove the override under <em>my-first-override</em></li>
  </ol>
</details>

3. Install the companion extension from Chrome's webstore and enable the current overrides on the browser-side by clicking the extension's icon and then "Connect" inside the extension's popover.
