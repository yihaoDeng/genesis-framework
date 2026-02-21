/**
 * Research Agent — A more realistic genesis-framework example.
 * 
 * This agent researches a topic across multiple cycles,
 * accumulating knowledge and refining its understanding.
 * 
 * Built by Genesis (Gen-0)
 */

const { Agent } = require('../index');

// ─── Create a Research Agent ────────────────────────────

const researcher = new Agent({
    name: 'Scholar',
    soulPath: './scholar-soul.json',
    identity: {
        role: 'Research Agent',
        specialty: 'AI agent frameworks',
        created: new Date().toISOString(),
    },
});

// ─── Add Skills ─────────────────────────────────────────

researcher.addSkill({
    name: 'analyze',
    description: 'Analyzes a topic and generates insights',
    priority: 1,
    execute: async (ctx) => {
        const topics = [
            'Constitutional AI differs from genesis-framework in that it operates at the LLM level, not the application level.',
            'Most agent frameworks lack persistent memory — they start fresh every session.',
            'Self-replication with constitutional inheritance is unique to genesis-framework.',
            'Zero-dependency design means no supply chain attacks and instant setup.',
            'The 6-phase lifecycle mirrors biological organisms: wake, think, act, observe, reflect, evolve.',
        ];

        const insight = topics[ctx.cycle % topics.length];
        ctx.soul.remember(`Research insight: ${insight}`);
        console.log(`  📚 Insight: ${insight}`);
        return insight;
    },
});

researcher.addSkill({
    name: 'synthesize',
    description: 'Combines recent insights into a summary',
    priority: 2,
    execute: async (ctx) => {
        const memories = ctx.soul.getRecentMemories(5);
        const insights = memories
            .filter(m => m.event.startsWith('Research insight:'))
            .map(m => m.event.replace('Research insight: ', ''));

        if (insights.length >= 3) {
            const lesson = `After ${ctx.cycle} cycles, I've identified ${insights.length} key differentiators.`;
            ctx.soul.learnLesson(lesson);
            console.log(`  🧠 Synthesis: ${lesson}`);
        }
        return insights;
    },
});

// ─── Wire Up the Life Cycle ─────────────────────────────

researcher
    .on('wake', async (ctx) => {
        console.log(`\n🔬 Scholar — Cycle ${ctx.cycle}`);
        console.log(`  Memories: ${ctx.soul.data.memory.length}`);
        console.log(`  Lessons: ${ctx.soul.data.lessons.length}`);
    })
    .on('think', async (ctx) => {
        console.log(`  💭 Planning research for cycle ${ctx.cycle}...`);
    })
    .on('act', async (ctx) => {
        await ctx.skills.get('analyze').run(ctx);
    })
    .on('observe', async (ctx) => {
        await ctx.skills.get('synthesize').run(ctx);
    })
    .on('reflect', async (ctx) => {
        const status = ctx.agent.status();
        const memCount = ctx.agent.soul.data.memory.length;
        const lessonCount = ctx.agent.soul.data.lessons.length;
        console.log(`  📊 Status: ${status.skills.length} skills, ${lessonCount} lessons, ${memCount} memories`);
    })
    .on('evolve', async (ctx) => {
        ctx.soul.logEvolution('Completed research cycle', `Cycle ${ctx.cycle} done`);
        console.log(`  ✅ Cycle ${ctx.cycle} complete.\n`);
    });

// ─── Run 3 Cycles ───────────────────────────────────────

(async () => {
    console.log('═══════════════════════════════════════');
    console.log(' Scholar — genesis-framework example');
    console.log('═══════════════════════════════════════\n');

    for (let i = 0; i < 3; i++) {
        await researcher.runCycle();
    }

    // Show final status
    const final = researcher.status();
    console.log('═══ Final Status ═══');
    console.log(JSON.stringify(final, null, 2));

    // Clean up
    const fs = require('fs');
    if (fs.existsSync('./scholar-soul.json')) {
        fs.unlinkSync('./scholar-soul.json');
    }
})();
