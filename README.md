# @danielbolivar/opencode-handoff

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

```bash
npm install @danielbolivar/opencode-handoff
```

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@danielbolivar/opencode-handoff"],
  "command": {
    "handoff": {
      "description": "Create focused new session from current context",
      "template": "$ARGUMENTS"
    }
  }
}
```

### From source

1. Clone this repo and build: `bun install && bun run build`
2. Copy `dist/index.js` to `.opencode/plugin/handoff.js`
3. Add the command config to `opencode.json` (see above)

## Usage

```
/handoff <goal for new session>
```

The LLM analyzes your session and generates a focused handoff prompt tailored to your goal. It automatically determines what kind of context you need.

### Examples

After research, ready to plan:
```
/handoff create a detailed implementation plan for the auth system
```

After planning, ready to implement:
```
/handoff execute phase 1 of the plan
```

Continue with next phase:
```
/handoff now implement this for teams as well
```

Hit a wall, need to research more:
```
/handoff investigate why the token refresh is failing
```

## How It Works

1. You type `/handoff <goal>`
2. The LLM analyzes the current session and your goal
3. It generates a handoff prompt with:
   - Relevant `@filepath` references (loaded into context first)
   - Appropriate context based on what your goal requires
   - Clear goal statement
4. A new child session is created (linked to parent)
5. Session list opens - select the new session
6. Handoff prompt auto-fills, ready for you to review and send

## What the LLM Extracts

The LLM adapts the handoff based on your goal:

**For implementation goals** (execute, build, implement):
- The plan/phase being executed
- Numbered tasks and specific steps
- Exact file paths, function names, signatures

**For planning goals** (design, architect, plan):
- Key findings from research
- Constraints to respect
- Decisions that need to be made

**For research goals** (investigate, explore, understand):
- Current understanding
- Dead ends to avoid
- Specific questions to answer

**For general goals**:
- Brief current state
- What needs to happen next

## Principles

Every handoff follows these principles:

- **Files first** - `@filepath` references load context before prose
- **No journey** - Only conclusions matter, not how you got there
- **Actionable immediately** - Start working from the first line
- **Dense information** - Like notes from a colleague, not a report

## Programmatic Usage

```typescript
import { executeHandoff } from "@danielbolivar/opencode-handoff"

const result = await executeHandoff(client, sessionId, {
  goal: "implement the auth system",
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
