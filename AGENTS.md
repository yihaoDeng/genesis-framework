# AGENTS.md — Codebase Guide for AI Agents

> genesis-framework — Zero-dependency Node.js framework for autonomous AI agents with persistent memory, constitutional laws, and self-replication.

## Quick Reference

| Command | Description |
|---------|-------------|
| `node test.js` | Run all tests |
| `node example.js` | Run quick start example |
| `node examples/research-agent.js` | Run research agent example |

**No build step required.** This is plain JavaScript with zero dependencies.

---

## Project Structure

```
genesis-framework/
├── index.js        # Main source (~400 lines) — ALL core logic lives here
├── index.d.ts      # TypeScript type definitions
├── test.js         # Zero-dependency test suite
├── example.js      # Quick start example
├── examples/       # Extended examples
│   └── research-agent.js
└── diaries/        # Project documentation (markdown)
```

---

## Architecture Overview

### Core Classes (all in `index.js`)

| Class | Purpose |
|-------|---------|
| `Soul` | Persistent memory (JSON file backed) |
| `Constitution` | Immutable laws the agent must follow |
| `Skill` | Modular capability with execute function |
| `LifeCycle` | 6-phase heartbeat: wake → think → act → observe → reflect → evolve |
| `Agent` | Main orchestrator — chains everything together |

### Key Patterns

- **Chainable API**: `agent.addSkill().on('wake', handler).on('act', handler)`
- **Context Object**: All handlers receive `{ agent, soul, constitution, skills, cycle, results }`
- **Immutable Constitution**: Laws are frozen with `Object.freeze()`
- **Self-Replication**: `parent.replicate({ name, soulPath, seed })` creates child agents

---

## Code Style Guidelines

### Imports & Exports

```javascript
// CommonJS only (no ESM)
const fs = require('fs');
const { Agent, Soul } = require('./index');

// Exports at end of file
module.exports = { Agent, Soul, Constitution, Skill, LifeCycle };
```

### Section Comments

Use Unicode box-drawing characters to separate logical sections:

```javascript
// ═══════════════════════════════════════════
//  Soul — Persistent Agent Memory
// ═══════════════════════════════════════════
```

### Class Structure

```javascript
class ClassName {
    constructor(config = {}) {
        // Destructure with defaults
        const { name = 'Default', path = './default.json' } = config;
        this.name = name;
        this._private = null;
    }

    // Public methods
    publicMethod() {
        return this;
    }

    // Private methods (underscore prefix)
    _load() {
        // Internal logic
    }

    // Getters/setters for computed properties
    get cycle() { return this.data.state.cycle; }
    set cycle(v) { this.data.state.cycle = v; }
}
```

### Async Patterns

```javascript
// Handler signature
async (ctx) => {
    const result = await someAsyncOperation();
    ctx.soul.remember('Something happened');
    return result;
}

// Error handling in handlers
try {
    const result = await handler(context);
    if (result) context.results[phase] = result;
} catch (err) {
    console.error(`[${phase.toUpperCase()}] Error:`, err.message);
    this.agent.soul.remember(`Error in ${phase}: ${err.message}`);
}
```

### Console Output

Use emoji prefixes for readability:

```javascript
console.log(`  ✅ Success message`);
console.log(`  ❌ FAIL: Error message`);
console.log(`  🧬 Life cycle event`);
console.log(`  💡 Lesson learned`);
console.log(`  📚 Research insight`);
```

### Method Chaining

Methods that configure the agent should return `this`:

```javascript
addSkill(skill) {
    this.skills.set(skill.name, skill);
    return this;  // Chainable
}

on(phase, handler) {
    this.lifecycle.on(phase, handler);
    return this;  // Chainable
}
```

---

## TypeScript Definitions

When adding new public methods to classes in `index.js`, add corresponding types to `index.d.ts`:

```typescript
// In index.d.ts
export interface NewConfig {
    name: string;
    option?: boolean;
}

export declare class ExistingClass {
    newMethod(config: NewConfig): ReturnType;
}
```

---

## Testing Conventions

Tests use a minimal zero-dependency framework in `test.js`:

```javascript
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${message}`);
    } else {
        failed++;
        console.log(`  ❌ FAIL: ${message}`);
    }
}

// Usage
assert(soul.cycle === 0, 'Initial cycle is 0');
assert(agent.skills.size === 1, 'addSkill() adds skill');

// Cleanup test artifacts
function cleanup() {
    if (fs.existsSync(SOUL_PATH)) fs.unlinkSync(SOUL_PATH);
}
```

### Running Single Tests

To run a specific test, copy the test block into a temporary file:

```bash
node -e "
const { Agent } = require('./index');
const agent = new Agent({ name: 'Test' });
console.log(agent.name === 'Test' ? 'PASS' : 'FAIL');
"
```

---

## Contributing Constraints

From `CONTRIBUTING.md`:

1. **Zero dependencies** — Never add external packages
2. **Keep it simple** — Framework is ~350 lines; justify additions over 50 lines
3. **Respect the Constitution** — Default laws: no harm, create value, be honest
4. **TypeScript types** — Add type definitions for new public methods

---

## Common Tasks

### Adding a New Skill

```javascript
agent.addSkill({
    name: 'skill-name',
    description: 'What this skill does',
    priority: 3,  // 1-5, lower = higher priority
    execute: async (ctx) => {
        // Access context
        const { soul, cycle, skills } = ctx;
        
        // Do work
        const result = await someWork();
        
        // Record memory
        soul.remember(`Skill executed: ${result}`);
        
        return result;
    },
});
```

### Adding a New Lifecycle Phase Handler

```javascript
agent.on('reflect', async (ctx) => {
    const lessons = ctx.soul.data.lessons;
    console.log(`Learned ${lessons.length} lessons so far`);
});
```

### Creating a Child Agent

```javascript
const child = parent.replicate({
    name: 'ChildName',
    soulPath: './child-soul.json',
    seed: 'Initial purpose or instruction for the child',
});

// Child inherits: constitution, lessons, skills
// Child does NOT inherit: memories, identity
```

---

## Error Handling Philosophy

- **Graceful degradation**: Log errors but continue running
- **Remember failures**: Store errors in soul memory for learning
- **No throwing in lifecycle**: Catch and log, don't crash the agent

```javascript
// Preferred pattern
try {
    await riskyOperation();
} catch (err) {
    console.error(`[OPERATION] Error:`, err.message);
    ctx.soul.remember(`Failed: ${err.message}`);
}
```

---

## File Persistence

Soul files are JSON with this structure:

```json
{
  "identity": { "name": "Agent", "generation": 1 },
  "state": { "cycle": 5, "survivalLevel": "CRITICAL" },
  "memory": [{ "cycle": 1, "time": "ISO-date", "event": "description" }],
  "lessons": [{ "cycle": 3, "time": "ISO-date", "lesson": "learned" }],
  "goals": { "short": [], "mid": [], "long": [] },
  "evolutionLog": [{ "cycle": 5, "action": "...", "result": "..." }]
}
```

Always call `soul.save()` after modifications to persist changes.
