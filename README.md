# opencode-handoff

Transfer context to focused new sessions without compaction loss.

Handoff creates a new session with intelligently extracted context from your current session. Unlike compaction (which is lossy), handoff lets you specify what the new session should focus on, and the LLM distills only the relevant context.

## Why Handoff?

The best workflow for complex tasks:

```
Research Session → Planning Session → Implementation Session
     (messy)          (focused)           (pristine)
```

Each handoff creates a clean context window with only conclusions, not the journey.

- **Research → Planning**: Distills findings into actionable insights
- **Planning → Implementation**: Extracts just the finalized plan
- **No mid-impl compaction**: Fresh context means better accuracy

## Installation

### From npm

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-handoff"],
  "command": {
    "handoff": {
      "description": "Create focused new session from current context",
      "template": "$ARGUMENTS"
    }
  }
}
```

### From local files

1. Clone/copy this repo
2. Build with `bun run build`
3. Copy `dist/index.js` to `.opencode/plugin/handoff.js`
4. Add the command config to `opencode.json`:

```json
{
  "command": {
    "handoff": {
      "description": "Create focused new session from current context", 
      "template": "$ARGUMENTS"
    }
  }
}
```

## Usage

```
/handoff <goal for new session>
```

The plugin will:
1. Ask the LLM to analyze the current session
2. Generate a focused handoff prompt with relevant context
3. Create a new child session
4. Open the session list for you to select the new session
5. Auto-fill the handoff prompt when you switch

### Examples

After a research session:
```
/handoff create a detailed implementation plan for the auth system
```

After a planning session:
```
/handoff execute phase 1 of the plan
```

Continuing implementation:
```
/handoff now implement this for teams as well, not just individual users
```

## How It Works

1. You type `/handoff <goal>`
2. The plugin sends a meta-prompt to the LLM asking it to analyze the session
3. The LLM generates a focused handoff prompt containing:
   - Relevant conclusions and decisions (not the journey)
   - File references using `@filepath` syntax
   - Your goal for the new session
4. A new child session is created (linked to parent)
5. Session list opens for you to select the new session
6. When you switch, the handoff prompt auto-fills
7. Review/edit and press Enter to start

## Handoff Types

The plugin automatically detects the type of handoff based on your goal:

| Type | Triggered by | Focus |
|------|--------------|-------|
| `impl` | "execute", "implement", "build", "phase" | Just the plan, minimal context |
| `planning` | "plan", "design", "architect" | Research findings and decisions |
| `research` | "research", "explore", "investigate" | Conclusions and next directions |
| `general` | (default) | Balanced context extraction |

## Programmatic Usage

You can use the handoff function directly in your own plugins:

```typescript
import { executeHandoff } from "opencode-handoff"

const result = await executeHandoff(client, sessionId, {
  goal: "implement the auth system",
  type: "impl", // optional override
})

console.log(result.newSessionId) // ID of the new session
console.log(result.prompt)       // The generated handoff prompt
console.log(result.files)        // File references extracted
```

## Development

```bash
bun install
bun run build
bun run typecheck
```

## License

MIT
