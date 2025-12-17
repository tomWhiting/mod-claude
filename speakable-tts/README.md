# speakable-tts

A Claude Code hook that sends assistant responses to a text-to-speech server for audio playback.

## Requirements

- Audio server running at `http://localhost:8766/api/speakable` (or set `SPEAKABLE_URL` environment variable)

## How it works

When Claude finishes responding (Stop hook), this plugin:

1. Reads the transcript file to extract the last assistant message
2. Sends the text to the speakable API endpoint
3. The audio server humanizes and speaks the response aloud

## Installation

```bash
/plugin install speakable-tts@mod-claude
```

## Configuration

Set `SPEAKABLE_URL` environment variable to customize the API endpoint:

```bash
export SPEAKABLE_URL="http://localhost:8766/api/speakable"
```

## Source

The TypeScript source and multi-message variant are available in the workspace:
`workspace/typescript/speakable-hook/`
