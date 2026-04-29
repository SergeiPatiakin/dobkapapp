## Install

```bash
npm ci
```

## Start for development

```bash
npm run tauri dev
```

<br />

## Reset database state (macOS)

```bash
rm ~/Library/Application\ Support/dobkapapp/db.sqlite
```

## Reset database state (Windows)

```bash
rm ~/AppData/Roaming/dobkapapp/db.sqlite
```

## Bumping dobkapapp version
Make sure you cover the following locations:
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
