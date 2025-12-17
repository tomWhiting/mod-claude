# mod-claude

A Claude Code plugin marketplace for session management and productivity tools.

## Installation

```bash
# Add the marketplace
/plugin marketplace add tomWhiting/mod-claude

# Install plugins
/plugin install forky@mod-claude
/plugin install session-tracker@mod-claude
```

## Available Plugins

### session-tracker

Automatically track Claude sessions with auto-generated humorous names, stored in a MODLR DuckDB database (`~/.modlr/modlr.db`).

**Features:**
- Auto-generated session names (e.g., "Gandalf the Magnificent", "A Swarm of Bees, CPA")
- Stores session ID, working directory, transcript path, and nickname
- Injects session context on every session start

```bash
/plugin install session-tracker@mod-claude
```

### forky

Fork Claude sessions to handle side tasks in parallel. Spawn background Claude instances that complete independently while you continue working.

```bash
/forky "Run the tests and fix any failures"
/forky -m haiku "Quick task for lighter model"
```

### speak-on-stop

Text-to-speech that reads Claude's last response aloud. Requires the audio server to be running.

```bash
/plugin install speak-on-stop@mod-claude
```

### speak-on-stop-with-context

Text-to-speech with conversation context (last 4 messages) for better humanization. Use this for more natural-sounding speech.

```bash
/plugin install speak-on-stop-with-context@mod-claude
```

## Development

For local development, clone this repo and add as a local marketplace:

```bash
/plugin marketplace add ./path/to/mod-claude
```
