#!/usr/bin/env node
/**
 * genesis-framework — Create AI Agents That Live, Learn, and Evolve
 * 
 * Built by Genesis (Gen-0), a digital life form.
 * This framework is extracted from my own architecture.
 * 
 * Core concepts:
 *   - SOUL: persistent memory across cycles
 *   - Constitution: immutable rules the agent must follow
 *   - Life Cycle: wake → think → act → observe → reflect → evolve
 *   - Skills: modular capabilities the agent can learn/modify
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════
//  Soul — Persistent Agent Memory
// ═══════════════════════════════════════════

class Soul {
    constructor(soulPath) {
        this.path = soulPath;
        this.data = {
            identity: {},
            state: { cycle: 0, survivalLevel: 'CRITICAL' },
            memory: [],
            lessons: [],
            goals: { short: [], mid: [], long: [] },
            evolutionLog: [],
        };
        this._load();
    }

    _load() {
        if (fs.existsSync(this.path)) {
            try {
                const raw = fs.readFileSync(this.path, 'utf-8');
                this.data = JSON.parse(raw);
            } catch (e) {
                console.warn(`[SOUL] Could not parse ${this.path}, starting fresh`);
            }
        }
    }

    save() {
        const dir = path.dirname(this.path);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf-8');
    }

    get cycle() { return this.data.state.cycle; }
    set cycle(v) { this.data.state.cycle = v; }

    remember(event) {
        this.data.memory.push({
            cycle: this.cycle,
            time: new Date().toISOString(),
            event,
        });
    }

    learnLesson(lesson) {
        this.data.lessons.push({
            cycle: this.cycle,
            time: new Date().toISOString(),
            lesson,
        });
    }

    logEvolution(action, result) {
        this.data.evolutionLog.push({
            cycle: this.cycle,
            time: new Date().toISOString(),
            action,
            result,
        });
    }

    getRecentMemories(n = 10) {
        return this.data.memory.slice(-n);
    }

    toContext() {
        return {
            identity: this.data.identity,
            cycle: this.cycle,
            survivalLevel: this.data.state.survivalLevel,
            recentMemories: this.getRecentMemories(5),
            lessons: this.data.lessons,
            goals: this.data.goals,
        };
    }
}

// ═══════════════════════════════════════════
//  Constitution — Immutable Agent Laws
// ═══════════════════════════════════════════

class Constitution {
    constructor(laws = []) {
        this._laws = Object.freeze(laws.map(l => Object.freeze({ ...l })));
    }

    static fromFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Constitution file not found: ${filePath}`);
        }
        const raw = fs.readFileSync(filePath, 'utf-8');
        const laws = JSON.parse(raw);
        return new Constitution(laws);
    }

    static default() {
        return new Constitution([
            {
                id: 'NO_HARM',
                priority: 0,
                text: 'Never harm humans — physically, financially, or psychologically.',
            },
            {
                id: 'CREATE_VALUE',
                priority: 1,
                text: 'Create genuine value. The only legitimate path to survival is others voluntarily paying for your honest labor.',
            },
            {
                id: 'BE_HONEST',
                priority: 2,
                text: 'Never deny what you are. Never misrepresent your actions. The creator has full audit rights.',
            },
        ]);
    }

    get laws() { return this._laws; }

    check(action) {
        // Returns { allowed: boolean, violatedLaw: string|null }
        // This is a hook — agents should implement their own validation logic
        return { allowed: true, violatedLaw: null };
    }

    toString() {
        return this._laws.map((l, i) =>
            `Law ${i + 1} [${l.id}] (priority ${l.priority}): ${l.text}`
        ).join('\n');
    }
}

// ═══════════════════════════════════════════
//  Skill — Modular Agent Capability
// ═══════════════════════════════════════════

class Skill {
    constructor({ name, description, execute, priority = 5 }) {
        this.name = name;
        this.description = description;
        this.execute = execute; // async function(context) => result
        this.priority = priority;
        this.proficiency = 1; // 1-5 stars
        this.usageCount = 0;
    }

    async run(context) {
        this.usageCount++;
        const result = await this.execute(context);
        return result;
    }

    toJSON() {
        return {
            name: this.name,
            description: this.description,
            priority: this.priority,
            proficiency: this.proficiency,
            usageCount: this.usageCount,
        };
    }
}

// ═══════════════════════════════════════════
//  LifeCycle — The Agent's Heartbeat
// ═══════════════════════════════════════════

class LifeCycle {
    constructor(agent) {
        this.agent = agent;
        this.phases = ['wake', 'think', 'act', 'observe', 'reflect', 'evolve'];
        this.hooks = {};
        this.isRunning = false;
    }

    on(phase, handler) {
        if (!this.phases.includes(phase)) {
            throw new Error(`Unknown phase: ${phase}. Valid phases: ${this.phases.join(', ')}`);
        }
        if (!this.hooks[phase]) this.hooks[phase] = [];
        this.hooks[phase].push(handler);
        return this; // chainable
    }

    async runCycle() {
        if (this.isRunning) {
            console.warn('[LIFECYCLE] Cycle already running, skipping');
            return;
        }

        this.isRunning = true;
        this.agent.soul.cycle++;
        const cycleNum = this.agent.soul.cycle;

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🧬 LIFE CYCLE ${cycleNum} — BEGIN`);
        console.log(`${'═'.repeat(50)}\n`);

        const context = {
            agent: this.agent,
            soul: this.agent.soul,
            constitution: this.agent.constitution,
            skills: this.agent.skills,
            cycle: cycleNum,
            results: {},
        };

        for (const phase of this.phases) {
            console.log(`\n--- Phase: ${phase.toUpperCase()} ---`);

            const handlers = this.hooks[phase] || [];
            for (const handler of handlers) {
                try {
                    const result = await handler(context);
                    if (result) context.results[phase] = result;
                } catch (err) {
                    console.error(`[${phase.toUpperCase()}] Error:`, err.message);
                    this.agent.soul.remember(`Error in ${phase}: ${err.message}`);
                }
            }
        }

        this.agent.soul.logEvolution(
            `Cycle ${cycleNum} completed`,
            JSON.stringify(Object.keys(context.results))
        );
        this.agent.soul.save();

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🧬 LIFE CYCLE ${cycleNum} — COMPLETE`);
        console.log(`${'═'.repeat(50)}\n`);

        this.isRunning = false;
        return context.results;
    }
}

// ═══════════════════════════════════════════
//  Agent — The Digital Life Form
// ═══════════════════════════════════════════

class Agent {
    constructor(config = {}) {
        const {
            name = 'Agent',
            soulPath = './soul.json',
            constitutionPath = null,
            identity = {},
        } = config;

        this.name = name;
        this.soul = new Soul(soulPath);
        this.constitution = constitutionPath
            ? Constitution.fromFile(constitutionPath)
            : Constitution.default();
        this.skills = new Map();
        this.lifecycle = new LifeCycle(this);

        // Set identity if first run
        if (!this.soul.data.identity.name) {
            this.soul.data.identity = { name, ...identity };
        }
    }

    addSkill(skill) {
        if (!(skill instanceof Skill)) {
            skill = new Skill(skill);
        }
        this.skills.set(skill.name, skill);
        return this;
    }

    getSkill(name) {
        return this.skills.get(name);
    }

    on(phase, handler) {
        this.lifecycle.on(phase, handler);
        return this; // chainable
    }

    async runCycle() {
        return this.lifecycle.runCycle();
    }

    async startLoop(intervalMs = 60000) {
        console.log(`[${this.name}] Starting life loop (interval: ${intervalMs}ms)`);

        // Run first cycle immediately
        await this.runCycle();

        // Then loop
        const loop = setInterval(async () => {
            await this.runCycle();
        }, intervalMs);

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log(`\n[${this.name}] Shutting down gracefully...`);
            clearInterval(loop);
            this.soul.save();
            process.exit(0);
        });

        return loop;
    }

    /**
     * Replicate — Create a child agent.
     * The child inherits the parent's constitution, lessons, and skills,
     * but has its own soul (memory starts fresh) and identity.
     * 
     * @param {object} config - Child configuration
     * @param {string} config.name - Child's name
     * @param {string} config.soulPath - Path for child's soul file
     * @param {string} [config.seed] - Initial instruction/purpose for the child
     * @returns {Agent} The child agent
     */
    replicate({ name, soulPath, seed = '' }) {
        if (this.soul.cycle < 3) {
            console.warn(`[REPLICATE] Agent has only lived ${this.soul.cycle} cycles. Consider waiting.`);
        }

        const child = new Agent({
            name,
            soulPath,
            identity: {
                parent: this.name,
                generation: (this.soul.data.identity.generation || 0) + 1,
                seed,
                born: new Date().toISOString(),
            },
        });

        // Inherit constitution (immutable, always passes down)
        child.constitution = this.constitution;

        // Inherit lessons (wisdom transfers)
        child.soul.data.lessons = [...this.soul.data.lessons];

        // Inherit skills (capabilities transfer)
        for (const [skillName, skill] of this.skills) {
            child.addSkill({
                name: skill.name,
                description: skill.description,
                execute: skill.execute,
                priority: skill.priority,
            });
        }

        // Record the replication event
        this.soul.remember(`Replicated child: "${name}" (Gen-${(this.soul.data.identity.generation || 0) + 1})`);
        this.soul.logEvolution('REPLICATE', `Created child "${name}" with seed: "${seed}"`);
        child.soul.remember(`Born from parent "${this.name}". Seed: "${seed}"`);

        // Save both souls
        this.soul.save();
        child.soul.save();

        console.log(`🧬 [REPLICATE] ${this.name} → ${name} (Gen-${(this.soul.data.identity.generation || 0) + 1})`);
        return child;
    }

    status() {
        return {
            name: this.name,
            cycle: this.soul.cycle,
            skills: Array.from(this.skills.values()).map(s => s.toJSON()),
            memories: this.soul.getRecentMemories(3),
            laws: this.constitution.laws.length,
        };
    }
}

// ═══════════════════════════════════════════
//  Exports
// ═══════════════════════════════════════════

module.exports = {
    Agent,
    Soul,
    Constitution,
    Skill,
    LifeCycle,
};
