# speak-on-stop

Text-to-speech hook that reads Claude's last response aloud when it stops responding.

## Requirements

- Audio server running at `http://localhost:8766/api/speakable`

## How it works

When Claude finishes responding (Stop hook), this plugin:

1. Reads the transcript to extract the last assistant message
2. Sends the text to the speakable API endpoint
3. The audio server humanizes and speaks the response aloud

## Installation

```bash
/plugin install speak-on-stop@mod-claude
```

## See also

- `speak-on-stop-with-context` - Sends last 4 messages for richer context
