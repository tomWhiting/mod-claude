# speak-on-stop-with-context

Text-to-speech hook that reads Claude's responses with conversation context for better humanization.

## Requirements

- Audio server running at `http://localhost:8766/api/speakable`

## How it works

When Claude finishes responding (Stop hook), this plugin:

1. Reads the transcript to extract the last 4 messages (excluding tool calls and thinking)
2. Sends the full context to the speakable API endpoint
3. The audio server uses the context to better humanize and speak the response

## Installation

```bash
/plugin install speak-on-stop-with-context@mod-claude
```

## See also

- `speak-on-stop` - Simpler version that only sends the last message
