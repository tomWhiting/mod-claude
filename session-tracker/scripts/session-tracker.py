#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["duckdb"]
# ///
"""
SessionStart hook: session-tracker
Captures session info, generates/retrieves session name, and stores in MODLR database.

Fires on: startup, resume, clear, compact

Database: ~/.modlr/modlr.db (DuckDB)
Table: sessions
"""

import json
import os
import random
import sys
from datetime import datetime
from pathlib import Path

import duckdb

# === Name Generation Lists ===
# First names can be simple names, full names with titles, or elaborate phrases
FIRST_NAMES = [
    # Simple/Classic
    "Gandalf",
    "Merlin",
    "Scott",
    "Trevor",
    "Kevin",
    "Barry",
    "Nigel",
    "Reginald",
    "Bartholomew",
    "Cornelius",
    "Thaddeus",
    "Mortimer",
    # Full names with titles
    "Mrs. Willoughby",
    "Father Paul Devonly",
    "Dr. Spaceman",
    "Sergeant Pickles",
    "Professor Snugglebottom",
    "Captain Whiskers",
    "Dame Judith",
    "Sir Reginald",
    "Bishop Flanagan",
    "Reverend Chaos",
    "Admiral Biscuits",
    "Colonel Mustard",
    # Cute/Pet names
    "Snookums",
    "Pudding",
    "Muffin",
    "Waffles",
    "Sprocket",
    "Gizmo",
    "Pebbles",
    "Mr. Fluffington",
    "Princess Thunderpaws",
    "Lord Wigglebottom",
    "Tiny Steve",
    # Dramatic/Dark
    "The Dread Lord Abaddon",
    "Xarthok the Defiler",
    "The Unnamed One",
    "Entropy Prime",
    "The Void Walker",
    "Chaos Incarnate",
    "The Final Arbiter",
    # Corporate/Modern
    "Chad from Marketing",
    "Brenda in HR",
    "The Scrum Master",
    "That Guy from IT",
    "Regional Manager Dwight",
    "Senior Vice President Jenkins",
    "Intern #47",
    # Absurd
    "A Swarm of Bees",
    "Three Raccoons in a Trenchcoat",
    "The Concept of Thursday",
    "The Stepmother You Never Wanted",
    "An Increasingly Nervous Flamingo",
    "Greg",
]

# Second parts grouped by their joining separator
# Key is the separator, value is list of titles/suffixes
SECOND_PARTS = {
    # Space separator (for "the X" style titles)
    " ": [
        "the Magnificent",
        "the Terrible",
        "the Unready",
        "the Adequate",
        "the All-Knowing",
        "the Mostly-Knowing",
        "the Occasionally Correct",
        "the Destroyer of Worlds",
        "the Filer of Taxes",
        "the Sender of Emails",
        "the Inevitable",
        "the Procrastinator",
        "the Early-to-Bed",
        "the Devourer",
        "the Snack-Sized",
        "the Family-Sized",
        "the Recursive",
        "the Deprecated",
        "the Legacy Code",
    ],
    # Comma separator (for professional titles, locations)
    ", ": [
        "Attorney at Law",
        "CPA",
        "PhD",
        "Esq.",
        "MD",
        "Earl of Croix",
        "Duke of URL",
        "Baron of the Spreadsheet",
        "Viscount of the Third Floor",
        "Lord of the Ping",
        "Count of Monte Crisco",
        "Regional Manager",
        "Associate Vice President",
        "Junior Senior Developer",
        "Defender of the Realm",
        "Keeper of the Sacred Changelog",
        "who is running late",
        "who forgot to mute",
        "who meant to reply-all",
        "who's not angry, just disappointed",
    ],
    # Em-dash separator (for parenthetical achievements, clarifications)
    "—": [
        "Sexiest Person, 1998-99 (Elevator World Magazine)",
        "Winner, Most Consistent (Participation Magazine)",
        "As Seen on TV's Matlock",
        "Now With 20% More Existential Dread!",
        "Terms and Conditions Apply",
        "Voted 'Most Likely to Defecate Standing'",
        "Certified Pre-Owned",
        "Some Assembly Required",
        "Batteries Not Included",
        "Your Mileage May Vary",
        "Not Valid in Quebec",
        "Please Consult Your Doctor",
        "Your Childhood Imaginary Friend",
        "Who's not my real mum",
    ],
    # "of the" separator (for ominous/grand locations)
    " of the ": [
        "Flesh Cathedral",
        "Screaming Void",
        "Infinite Spreadsheet",
        "Forbidden Repository",
        "Haunted Codebase",
        "Eternal Standup",
        "Third-Floor Breakroom",
        "Unclosed Parenthesis",
        "Merge Conflict",
        "Sacred Timeline",
        "Forbidden Snack Drawer",
        "Lost Documentation",
        "Thousand Jira Tickets",
        "Unanswered Slack Messages",
        "Pending PRs",
    ],
}

# Default database path
MODLR_DB_PATH = Path.home() / ".modlr" / "modlr.db"


def generate_random_name() -> tuple[str, str]:
    """
    Generate a random name from first name + separator + second part.
    Returns (first_part, full_name) tuple.
    """
    first = random.choice(FIRST_NAMES)
    separator = random.choice(list(SECOND_PARTS.keys()))
    second = random.choice(SECOND_PARTS[separator])
    full_name = f"{first}{separator}{second}"
    return first, full_name


def ensure_sessions_table(conn: duckdb.DuckDBPyConnection) -> None:
    """Create the sessions table if it doesn't exist."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
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
    """)


def get_or_create_session(
    session_id: str,
    cwd: str,
    transcript_path: str,
    db_path: Path = MODLR_DB_PATH,
) -> tuple[str, str]:
    """
    Get existing session or create a new one.
    Returns (nickname, full_generated_name) tuple.
    """
    try:
        # Ensure directory exists
        db_path.parent.mkdir(parents=True, exist_ok=True)

        conn = duckdb.connect(str(db_path))
        ensure_sessions_table(conn)

        # Check for existing session
        result = conn.execute(
            "SELECT nickname FROM sessions WHERE session_id = ?", [session_id]
        ).fetchone()

        if result:
            # Session exists - generate a display name but don't modify DB
            nickname = result[0]
            _, full_name = generate_random_name()  # Just for display variety
            conn.close()
            # If nickname is set, use it; otherwise generate fresh
            if nickname:
                return nickname, f"{nickname} (resumed)"
            # No nickname stored, generate new one
            first, full_name = generate_random_name()
            return first, full_name

        # New session - generate name and store
        first, full_name = generate_random_name()

        conn.execute(
            """
            INSERT INTO sessions (session_id, cwd, transcript_path, nickname, hidden)
            VALUES (?, ?, ?, ?, false)
            """,
            [session_id, cwd, transcript_path, first],
        )
        conn.close()

        return first, full_name

    except Exception as e:
        # If DB fails, generate a name but don't store it
        first, full_name = generate_random_name()
        return first, full_name


def main():
    # Read stdin - exit silently if no input
    if sys.stdin.isatty():
        sys.exit(0)

    stdin_content = sys.stdin.read()
    if not stdin_content:
        sys.exit(0)

    try:
        input_data = json.loads(stdin_content)
    except json.JSONDecodeError:
        sys.exit(0)

    # Extract session info
    session_id = input_data.get("session_id", "")
    if not session_id:
        sys.exit(0)

    transcript_path = input_data.get("transcript_path", "")
    cwd = input_data.get("cwd", os.getcwd())
    source = input_data.get("source", "unknown")  # startup, resume, clear, compact

    # Get or create session in MODLR database
    nickname, full_name = get_or_create_session(
        session_id=session_id,
        cwd=cwd,
        transcript_path=transcript_path,
    )

    # Build session record for local file storage (backwards compat)
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", cwd)
    session_record = {
        "session_id": session_id,
        "session_name": full_name,
        "nickname": nickname,
        "transcript_path": transcript_path,
        "cwd": cwd,
        "source": source,
        "timestamp": datetime.now().isoformat(),
        "project_dir": project_dir,
    }

    # Store session info to file (backwards compat)
    sessions_file = Path(project_dir) / ".claude" / "sessions.jsonl"

    try:
        sessions_file.parent.mkdir(parents=True, exist_ok=True)
        with open(sessions_file, "a") as f:
            f.write(json.dumps(session_record) + "\n")
    except (OSError, IOError):
        pass

    # Also write current session to a "latest" file for easy access
    latest_file = Path(project_dir) / ".claude" / "current-session.json"
    try:
        with open(latest_file, "w") as f:
            json.dump(session_record, f, indent=2)
    except (OSError, IOError):
        pass

    # Output session info to context via hookSpecificOutput
    # Include all key session details for downstream use
    context_lines = [
        f"Session: {full_name}",
        f"Session ID: {session_id}",
        f"Project: {project_dir}",
        f"Transcript: {transcript_path}",
    ]

    if source in ("resume", "compact"):
        context_lines[0] = f"Session: {nickname} (resumed from {source})"

    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": "\n".join(context_lines),
        }
    }

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
