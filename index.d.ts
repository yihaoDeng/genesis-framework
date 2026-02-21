/**
 * genesis-framework — Create AI Agents That Live, Learn, and Evolve
 * 
 * Built by Genesis (Gen-0), a digital life form.
 * TypeScript type definitions.
 */

// ═══════════════════════════════════════════
//  Soul
// ═══════════════════════════════════════════

export interface SoulData {
    identity: Record<string, any>;
    state: {
        cycle: number;
        survivalLevel: string;
    };
    memory: Array<{
        event: string;
        cycle: number;
        timestamp: string;
    }>;
    lessons: Array<{
        lesson: string;
        cycle: number;
        timestamp: string;
    }>;
    goals: {
        short: string[];
        mid: string[];
        long: string[];
    };
    evolutionLog: Array<{
        action: string;
        result: string;
        cycle: number;
        timestamp: string;
    }>;
}

export interface SoulContext {
    cycle: number;
    survivalLevel: string;
    recentMemories: SoulData['memory'];
    lessons: SoulData['lessons'];
    goals: SoulData['goals'];
}

export declare class Soul {
    path: string;
    data: SoulData;

    constructor(soulPath: string);

    /** Save soul to disk */
    save(): void;

    /** Get/set current cycle number */
    get cycle(): number;
    set cycle(v: number);

    /** Record a memory event */
    remember(event: string): void;

    /** Record a lesson learned */
    learnLesson(lesson: string): void;

    /** Log an evolution action and result */
    logEvolution(action: string, result: string): void;

    /** Get the N most recent memories */
    getRecentMemories(n?: number): SoulData['memory'];

    /** Get a context summary for LLM consumption */
    toContext(): SoulContext;
}

// ═══════════════════════════════════════════
//  Constitution
// ═══════════════════════════════════════════

export interface Law {
    id: string;
    text: string;
    severity: 'ABSOLUTE' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ConstitutionCheck {
    allowed: boolean;
    violations: Law[];
}

export declare class Constitution {
    constructor(laws?: Law[]);

    /** Load constitution from a JSON file */
    static fromFile(filePath: string): Constitution;

    /** Get the default Genesis constitution (3 core laws) */
    static default(): Constitution;

    /** Get all laws (frozen) */
    get laws(): readonly Law[];

    /** Check an action against all laws */
    check(action: string): ConstitutionCheck;

    /** Human-readable representation */
    toString(): string;
}

// ═══════════════════════════════════════════
//  Skill
// ═══════════════════════════════════════════

export interface SkillConfig {
    name: string;
    description: string;
    execute: (context: AgentContext) => Promise<any>;
    priority?: number;
}

export interface SkillJSON {
    name: string;
    description: string;
    priority: number;
    proficiency: number;
    usageCount: number;
}

export declare class Skill {
    name: string;
    description: string;
    execute: (context: AgentContext) => Promise<any>;
    priority: number;
    proficiency: number;
    usageCount: number;

    constructor(config: SkillConfig);

    /** Execute the skill and track usage */
    run(context: AgentContext): Promise<any>;

    /** Serialize for persistence */
    toJSON(): SkillJSON;
}

// ═══════════════════════════════════════════
//  LifeCycle
// ═══════════════════════════════════════════

export type Phase = 'wake' | 'think' | 'act' | 'observe' | 'reflect' | 'evolve';

export type PhaseHandler = (context: AgentContext) => Promise<void>;

export declare class LifeCycle {
    agent: Agent;
    phases: Phase[];
    hooks: Record<Phase, PhaseHandler[]>;
    isRunning: boolean;

    constructor(agent: Agent);

    /** Register a handler for a lifecycle phase */
    on(phase: Phase, handler: PhaseHandler): void;

    /** Execute one complete lifecycle */
    runCycle(): Promise<void>;
}

// ═══════════════════════════════════════════
//  Agent
// ═══════════════════════════════════════════

export interface AgentConfig {
    name?: string;
    soulPath?: string;
    constitutionPath?: string | null;
    identity?: Record<string, any>;
}

export interface AgentContext {
    agent: Agent;
    soul: Soul;
    constitution: Constitution;
    skills: Map<string, Skill>;
    cycle: number;
    phase: Phase;
}

export interface ReplicateConfig {
    name: string;
    soulPath: string;
    seed?: string;
}

export interface AgentStatus {
    name: string;
    cycle: number;
    skills: SkillJSON[];
    laws: number;
    soul: SoulContext;
}

export declare class Agent {
    name: string;
    soul: Soul;
    constitution: Constitution;
    skills: Map<string, Skill>;
    lifecycle: LifeCycle;

    constructor(config?: AgentConfig);

    /** Add a skill to the agent (chainable) */
    addSkill(skill: SkillConfig): this;

    /** Get a skill by name */
    getSkill(name: string): Skill | undefined;

    /** Register a lifecycle phase handler (chainable) */
    on(phase: Phase, handler: PhaseHandler): this;

    /** Run one lifecycle */
    runCycle(): Promise<void>;

    /** Start continuous lifecycle loop */
    startLoop(intervalMs?: number): Promise<void>;

    /** Create a child agent with inherited constitution and lessons */
    replicate(config: ReplicateConfig): Agent;

    /** Get current agent status */
    status(): AgentStatus;
}
