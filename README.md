# Vanilla Note

A vanilla JS simple note-taking or journal app powered by [Bazaar](https://cloud.bzr.dev/). It's purpose is to show off some of Bazaar's features, in particular identity, data storage and cross-device syncing.

It uses the [Bazaar JS SDK](https://www.npmjs.com/package/@bzr/bazaar).

## Local setup

No building, bundling, compiling or installing necessary. Though you do need to serve the `index.html` file with a local web server, e.g. [http-server](https://www.npmjs.com/package/http-server), in order to have a valid authentication redirect URI when creating your Bazaar app (see Bazaar setup below).

To use `http-server`, follow the appropriate [install instructions](https://www.npmjs.com/package/http-server#user-content-installation). Then run `http-server` on the command line, from this project's root directory (the same directory this README file is in). By default the app will run on `http://localhost:8080`, if that port is available.

## Bazaar setup

- Go to [Bazaar](https://cloud.bzr.dev/), create an account or sign in.
- Create a new app, giving it a name and adding at least one authentication redirect URI, for example `http://localhost:8080` or `https://my-awesome-app.com`.
- Then add your app ID as the `appId` property of the Bazaar config in `./js/app.js`.

## Note!

This is not a production-ready app. It also uses modern, not transpiled JavaScript, and will only run in modern browsers.
