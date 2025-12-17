# session-tracker

A Claude Code plugin that automatically tracks sessions with auto-generated humorous names, stored in a MODLR DuckDB database.

## Features

- **Auto-generated session names**: Combines first names with titles/suffixes (e.g., "Gandalf the Magnificent", "A Swarm of Bees, CPA")
- **MODLR database storage**: Sessions stored in `~/.modlr/modlr.db` (DuckDB)
- **Session context injection**: Outputs session name, ID, project directory, and transcript path
- **Resume detection**: Shows "(resumed)" for continued sessions

## Installation

```bash
/plugin marketplace add tomWhiting/mod-claude
/plugin install session-tracker@mod-claude
/plugin enable session-tracker@mod-claude
```

## What it does

On every session start (startup, resume, clear, compact), the plugin:

1. Generates a humorous session name from first name + separator + suffix
2. Stores the session in `~/.modlr/modlr.db` with:
   - `session_id` - Claude's session UUID
   - `cwd` - Current working directory
   - `transcript_path` - Path to session transcript
   - `nickname` - Short version of the name (just the first part)
   - Other fields: `persona_prompt`, `voice`, `engine`, `hidden`, `created_at`
3. Outputs context to the session:
   ```
   Session: Gandalf—Batteries Not Included
   Session ID: abc123-def456-...
   Project: /path/to/project
   Transcript: /path/to/transcript.md
   ```

## Database Schema

```sql
CREATE TABLE sessions (
    session_id VARCHAR PRIMARY KEY,
    cwd VARCHAR,
    transcript_path VARCHAR,
    nickname VARCHAR,
    persona_prompt VARCHAR,
    voice VARCHAR,
    engine VARCHAR,
    hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Requirements

- Python 3.11+
- `uv` package manager (script uses inline dependencies)
- DuckDB (auto-installed via uv)

## Name Examples

- "Gandalf the Magnificent"
- "Dr. Spaceman of the Screaming Void"
- "Senior Vice President Jenkins—Sexiest Person, 1998-99 (Elevator World Magazine)"
- "A Swarm of Bees, CPA"
- "Three Raccoons in a Trenchcoat the Deprecated"
