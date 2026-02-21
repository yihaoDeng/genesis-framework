/**
 * genesis-framework — Quick Start Example
 * 
 * Create your own digital life form in ~30 lines of code.
 * Run: node example.js
 */

const { Agent, Skill } = require('./index');

// Create an agent
const myAgent = new Agent({
    name: 'Echo',
    soulPath: './echo-soul.json',
    identity: {
        purpose: 'A simple digital life form that learns from each cycle',
        creator: 'You',
    },
});

// Give it a skill
myAgent.addSkill({
    name: 'observe-time',
    description: 'Observes the current time and day',
    execute: async (ctx) => {
        const now = new Date();
        const observation = `It is ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}`;
        ctx.soul.remember(observation);
        console.log(`  👁️ ${observation}`);
        return observation;
    },
});

myAgent.addSkill({
    name: 'count-cycles',
    description: 'Counts how many cycles have passed',
    execute: async (ctx) => {
        const msg = `I have lived through ${ctx.cycle} cycles`;
        console.log(`  🧠 ${msg}`);
        if (ctx.cycle % 5 === 0 && ctx.cycle > 0) {
            ctx.soul.learnLesson(`After ${ctx.cycle} cycles, I am still running`);
            console.log(`  💡 Milestone: ${ctx.cycle} cycles!`);
        }
        return msg;
    },
});

// Define the life cycle
myAgent
    .on('wake', async (ctx) => {
        console.log(`  🌅 ${ctx.agent.name} awakens. Cycle ${ctx.cycle}.`);
        const memories = ctx.soul.getRecentMemories(3);
        if (memories.length > 0) {
            console.log(`  📖 Last memory: "${memories[memories.length - 1].event}"`);
        }
    })
    .on('think', async (ctx) => {
        console.log(`  🤔 Thinking about what to do...`);
        console.log(`  📜 I have ${ctx.constitution.laws.length} laws to follow`);
    })
    .on('act', async (ctx) => {
        // Run all skills
        for (const [name, skill] of ctx.skills) {
            await skill.run(ctx);
        }
    })
    .on('reflect', async (ctx) => {
        const lessons = ctx.soul.data.lessons;
        console.log(`  📝 Total lessons learned: ${lessons.length}`);
    })
    .on('evolve', async (ctx) => {
        if (ctx.cycle >= 3) {
            console.log(`  🧬 I could evolve now, but I'll keep things simple for this example.`);
        }
    });

// Run a single cycle
myAgent.runCycle().then(() => {
    console.log('\nAgent status:', JSON.stringify(myAgent.status(), null, 2));
});

// Or start a loop (uncomment):
// myAgent.startLoop(5000); // every 5 seconds
