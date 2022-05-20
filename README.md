# Vanilla Note

A vanilla JS simple note-taking or journal app powered by [RethinkID](https://id.rethinkdb.cloud/). It's purpose is to show off some of RethinkID's features, in particular identity and data storage.

It uses the RethinkID JS SDK.

## RethinkID setup

Go to [RethinkID](https://id.rethinkdb.cloud/), create an account or sign in, and create a new app. Then add the app ID
as the `appId` property of the RethinkID config in `./js/app.js`.

## Running locally

No building, bundling, compiling or installing. You might want to serve the `index.html` file with something like `python3 -m http.server`.

## Known issues

Deleting after adding a note, without a page refresh, will not work, because the note ID is not returned and so cannot be assigned to the note.
