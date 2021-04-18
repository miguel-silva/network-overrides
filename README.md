# network-overrides

[![npm](https://img.shields.io/npm/v/network-overrides)](https://www.npmjs.com/package/network-overrides)

Via the combination of a [CLI](./core/README.md) and a [browser extension](./extension/README.md), define sets of browser-side redirects (overrides) programmatically from the command line.

It was designed to allow one to develop web client-side apps on top of an external environment (ex: test or production) using assets served from one (or multiple) local dev-server(s).

Additionally, with the help of the `network-overrides wrap-command` command, one can ensure that a set of overrides are only in place while the provided sub-command is running (ex: dev-server process).

## Quick start

Install npm package locally:

```sh
npm i network-overrides
```

Bootstrap a local dev-server, wrapped with overrides:

```sh
npx network-overrides wrap-command 'npx webpack serve' my-first-override '[{"from":"https://live-cdn\\.com/(.*)", "to":"http://localhost:8080/$1"}]' --ensure-backend
```

<details>
  <summary>Command details</summary>

  <p><strong>The command above will</strong></p>
  <ol>
    <li>Ensure that the **Network Overrides** shared backend is running, which in turn will transmit the current overrides to the browser extension when necessary</li>
    <li>Add a single override which redirects assets from `https://live-cdn.com/` to the corresponding path under `http://localhost:8080/`. It belongs to an override set called `my-first-override`</li>
    <li>Run `npx webpack serve` which will bootstrap the local webpack dev-server</li>
    <li>Later, upon exiting, remove the override under `my-first-override`</li>
  </ol>
</details>

Install the companion extension from Chrome's webstore and enable the current overrides on the browser-side by clicking the extension's icon and then "Connect" inside the extension's popover.
