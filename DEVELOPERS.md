# Dobkapapp

# Installation


Install dependencies using [npm](https://www.npmjs.com/) :

```bash
npm install
```

<br />

## Start : Development

To develop and run your application, you need to run following command.
<br />
Start electron application for development :

```bash
npm run start
```

<br />

## Lint : Development

To lint application source code using ESLint via this command :

```bash
npm run lint
```

<br />

## Package : Production

Customize and package your Electron app with OS-specific bundles (.app, .exe etc)

```bash
npm run package
```

<br />

## Make : Production

Making is a way of taking your packaged application and making platform specific distributables like DMG, EXE, or Flatpak files (amongst others).

```bash
npm run make
```

<br />


## Packager & Makers Configuration

This provides an easy way of configuring your packaged application and making platform specific distributables like DMG, EXE, or Flatpak files.

This configurations file is available in :

```bash
tools/forge/forge.config.js
```

For further information, you can visit [Electron Forge Configuration](https://www.electronforge.io/configuration)

## Reset database state (macOS)

rm ~/Library/Application\ Support/dobkapapp/db.sqlite

## Reset database state (Windows)

rm ~/AppData/Roaming/dobkapapp/db.sqlite

