/**
 * genesis-framework — Test Suite
 * 
 * Zero-dependency tests (no test framework needed).
 * Run: node test.js
 * 
 * Built by Genesis (Gen-0)
 */

const { Agent, Soul, Constitution, Skill, LifeCycle } = require('./index');
const fs = require('fs');

let passed = 0;
let failed = 0;
const SOUL_PATH = './_test-soul.json';

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${message}`);
    } else {
        failed++;
        console.log(`  ❌ FAIL: ${message}`);
    }
}

function cleanup() {
    if (fs.existsSync(SOUL_PATH)) fs.unlinkSync(SOUL_PATH);
    if (fs.existsSync('./_child-soul.json')) fs.unlinkSync('./_child-soul.json');
}

// ═══ Soul Tests ═══
console.log('\n🧠 Soul');

const soul = new Soul(SOUL_PATH);
assert(soul.cycle === 0, 'Initial cycle is 0');
assert(soul.data.memory.length === 0, 'Memory starts empty');
assert(soul.data.lessons.length === 0, 'Lessons start empty');

soul.remember('Test event');
assert(soul.data.memory.length === 1, 'remember() adds to memory');
assert(soul.data.memory[0].event === 'Test event', 'Memory stores event text');

soul.learnLesson('Test lesson');
assert(soul.data.lessons.length === 1, 'learnLesson() adds to lessons');

soul.logEvolution('Test action', 'Test result');
assert(soul.data.evolutionLog.length === 1, 'logEvolution() adds to log');

soul.cycle = 5;
assert(soul.cycle === 5, 'cycle setter works');

const recent = soul.getRecentMemories(10);
assert(recent.length === 1, 'getRecentMemories() returns memories');

const ctx = soul.toContext();
assert(ctx.cycle === 5, 'toContext() includes cycle');
assert(ctx.lessons.length === 1, 'toContext() includes lessons');

soul.save();
assert(fs.existsSync(SOUL_PATH), 'save() creates file');

// Reload
const soul2 = new Soul(SOUL_PATH);
assert(soul2.cycle === 5, 'Soul persists across loads');
assert(soul2.data.memory.length === 1, 'Memory persists across loads');

// ═══ Constitution Tests ═══
console.log('\n📜 Constitution');

const defaultConst = Constitution.default();
assert(defaultConst.laws.length === 3, 'Default has 3 laws');
assert(defaultConst.laws[0].id === 'NO_HARM', 'First law is NO_HARM');

const check = defaultConst.check('help someone');
assert(check.allowed === true, 'Benign action is allowed');

const custom = new Constitution([
    { id: 'TEST', text: 'Test law', severity: 'HIGH' },
]);
assert(custom.laws.length === 1, 'Custom constitution works');

const str = defaultConst.toString();
assert(str.includes('NO_HARM'), 'toString() includes law IDs');

// ═══ Skill Tests ═══
console.log('\n🔧 Skill');

const skill = new Skill({
    name: 'test-skill',
    description: 'A test skill',
    execute: async (ctx) => 'result',
});
assert(skill.name === 'test-skill', 'Skill has name');
assert(skill.proficiency === 1, 'Initial proficiency is 1');
assert(skill.usageCount === 0, 'Initial usage is 0');

const json = skill.toJSON();
assert(json.name === 'test-skill', 'toJSON() includes name');
assert(json.usageCount === 0, 'toJSON() includes usage count');

// ═══ Agent Tests ═══
console.log('\n🤖 Agent');

cleanup();
const agent = new Agent({
    name: 'TestBot',
    soulPath: SOUL_PATH,
});
assert(agent.name === 'TestBot', 'Agent has name');
assert(agent.soul instanceof Soul, 'Agent has soul');
assert(agent.constitution instanceof Constitution, 'Agent has constitution');
assert(agent.skills.size === 0, 'Agent starts with 0 skills');

// Chainable addSkill
const returned = agent.addSkill({
    name: 'ping',
    description: 'Pings',
    execute: async () => 'pong',
});
assert(returned === agent, 'addSkill() is chainable');
assert(agent.skills.size === 1, 'addSkill() adds skill');
assert(agent.getSkill('ping').name === 'ping', 'getSkill() works');

// Chainable on
const returned2 = agent.on('wake', async () => { });
assert(returned2 === agent, 'on() is chainable');

// Status
const status = agent.status();
assert(status.name === 'TestBot', 'status() includes name');
assert(status.skills.length === 1, 'status() includes skills');
assert(status.laws === 3, 'status() includes law count');

// ═══ Life Cycle Tests ═══
console.log('\n⚡ Life Cycle');

cleanup();
const lcAgent = new Agent({ name: 'LC-Bot', soulPath: SOUL_PATH });
let phases = [];

lcAgent
    .on('wake', async () => phases.push('wake'))
    .on('think', async () => phases.push('think'))
    .on('act', async () => phases.push('act'))
    .on('observe', async () => phases.push('observe'))
    .on('reflect', async () => phases.push('reflect'))
    .on('evolve', async () => phases.push('evolve'));

(async () => {
    await lcAgent.runCycle();
    assert(phases.length === 6, 'All 6 phases executed');
    assert(phases[0] === 'wake', 'First phase is wake');
    assert(phases[5] === 'evolve', 'Last phase is evolve');
    assert(lcAgent.soul.cycle === 1, 'Cycle incremented after run');

    // ═══ Replication Tests ═══
    console.log('\n🧬 Replication');

    const parent = new Agent({
        name: 'Parent',
        soulPath: SOUL_PATH,
    });
    parent.addSkill({
        name: 'think',
        description: 'Thinks',
        execute: async () => 'thought',
    });
    parent.soul.learnLesson('Important lesson');
    parent.soul.save();

    const child = parent.replicate({
        name: 'Child',
        soulPath: './_child-soul.json',
        seed: 'Be curious',
    });

    assert(child.name === 'Child', 'Child has its own name');
    assert(child.constitution.laws.length === 3, 'Child inherits constitution');
    assert(child.skills.has('think'), 'Child inherits skills');
    assert(child.soul.data.lessons.length >= 1, 'Child inherits lessons');
    assert(child.soul.data.memory.length === 0 ||
        child.soul.data.memory[0].event.includes('Born'), 'Child starts with birth memory');

    // ═══ Summary ═══
    console.log(`\n${'═'.repeat(40)}`);
    console.log(`  ${passed} passed, ${failed} failed`);
    console.log(`${'═'.repeat(40)}\n`);

    cleanup();
    process.exit(failed > 0 ? 1 : 0);
})();
