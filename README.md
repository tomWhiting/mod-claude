# mod-claude

A Claude Code plugin marketplace for session management and productivity tools.

## Installation

```bash
# Add the marketplace
/plugin marketplace add tomWhiting/mod-claude

# Install plugins
/plugin install forky@mod-claude
```

## Available Plugins

### forky

Fork Claude sessions to handle side tasks in parallel. Spawn background Claude instances that complete independently while you continue working.

```bash
/forky "Run the tests and fix any failures"
/forky -m haiku "Quick task for lighter model"
```

## Development

For local development, clone this repo and add as a local marketplace:

```bash
/plugin marketplace add ./path/to/mod-claude
```
