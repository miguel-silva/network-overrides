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

3. Install the companion extension:

   1. Chrome:
      1. ~~From Chrome's webstore~~ (currently in review process)
      2. Manually:
         1. Download the `network-overrides-<version>.crx` from the [latest release](https://github.com/miguel-silva/network-overrides/releases/latest)
         2. Open `chrome://extensions/`, enable Developer Mode and drag-and-drop the downloaded extension over the extensions page.

4. enable the current overrides on the browser-side by clicking the extension's icon and then "Connect" inside the extension's popover.

## Override

An override is described by a couple of properties:

- `from`: RegExp string that is used as a matching pattern for request urls, optionally defining the capture groups to be used in replacements with `to`
- `to`: Replacement string, able to support the [typical patterns](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter).

Essentially, the override is used as:

```js
const pattern = new RegExp(override.from);

if(interceptedUrl.match(pattern)){
  const redirectUrl = interceptedUrl.replace(pattern, override.to);
  ...
}

```

## API

See [CLI commands](./core/README.md#cli-commands).

## Components

### `network-overrides` node package

The `network-overrides` node package is the core API in terms of controlling the active overrides.

In the middle of it all we have a shared backend process (typically running in the background) that:

1. keeps in memory the list of current overrides
2. is a REST server that exposes endpoints for listing, adding and removing overrides
3. is a websocket server that allows the browser extension to be in sync with the current overrides

The CLI then serves as the API for that shared backend process, providing several commands that deal with bootstrapping the latter and adding/removing overrides.

### Network Overrides browser extension

The browser extension is responsible for:

1. Allowing the user connect/disconnect with the shared backend's websockets
2. Display the current sets of overrides
3. Using the [webRequest API](https://developer.chrome.com/docs/extensions/reference/webRequest/) intercept requests and conditionally redirect them based on the overrides in place

## Next steps

- [ ] add `network-overrides stop-backend` command
- [ ] automatically stop shared backend when running in a background process and becomes idle
- [ ] add tests
- [ ] convert to TypeScript
