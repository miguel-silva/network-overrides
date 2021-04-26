# Network Overrides CLI

[![npm](https://img.shields.io/npm/v/network-overrides)](https://www.npmjs.com/package/network-overrides)

CLI and backend for the **Network Overrides** browser extension, allowing one to define sets of browser-side redirects (overrides) programmatically from the command line.

See [the general documentation](https://github.com/miguel-silva/network-overrides#readme) more info and quick start guide.

## CLI commands

### start-backend

Format: `network-overrides start-backend [--background]`

Starts the shared overrides backend in port `8117`. In case the port is already occupied (probably the service is already running), it exits with code `2`.

Running it with the `--background` flag will start it as a background (detached) process instead.

### stop-backend

Format: `network-overrides stop-backend`

Stops the shared overrides backend, making it exit normally.

### add

Format: `network-overrides add <override-set-id> <overrides>`

Adds (or updates) a list of overrides that belong to a specific set. Inspired by cURL, the overrides can be described in a couple of ways:

- JSON string. ex:

```sh
network-overrides add google-search '[{from:"https://www.google.com/search/(.*)",to:"http://localhost:3000/$1"}]'
```

- path to JSON file preceeded by `@`. ex:

```sh
network-overrides add google-search @config/overrides.json
```

See [Override](https://github.com/miguel-silva/network-overrides#override) for more info on how to structure your overrides.

### remove

Format: `network-overrides remove <override-set-id>`

Removes the list of overrides that belong to a specific set. ex:

```sh
network-overrides remove google-search
```

### list

Format: `network-overrides list`

Logs to the console the list of overrides per set currently registered in the shared backend.

### wrap-command

Format: `network-overrides wrap-command <command-to-run> <override-set-id> <overrides> [--ensure-backend]`

Runs the provided command wrapped by (bound to) a set of overrides. It's a combination of several commands over the following steps:

1. with the `--ensure-backend` flag, it starts the backend shared background process
2. adds the supplied override set (`<override-set-id> <overrides>`), in a format similar to the [add command](#add).
3. runs the supplied command (`<command-to-run>`)
4. upon exit, removes the supplied override set (`<override-set-id>`)
