const Node = require("../node");
const Simulator = require("../simulator");
const QuorumEngine = require("../quorum");
const assert = require("node:assert/strict");

const {
    makeByzantine,
    stealKey,
    forgeVote
} = require("../attacks");

/*
 * Replace one validator's vote using its stolen key.
 * The validator identity is still counted only once.
 */
function impersonate(node, maliciousValue) {

    const stolenSecret = stealKey(node);

    node.vote = function(_) {

        return forgeVote(
            this.id,
            stolenSecret,
            maliciousValue
        );
    };
}

/*
 * Every experiment starts with a fresh validator set.
 * The original quorum engine deliberately remembers 4 nodes.
 */
function runExperiment(
    title,
    addSybilNodes,
    useStaleQuorum,
    compromiseB
) {

    console.log("\n========================================");
    console.log(title);
    console.log("========================================");

    const nodes = [

        new Node("A"),
        new Node("B"),
        new Node("C"),
        new Node("D")
    ];

    const originalQuorum =
        new QuorumEngine(nodes.length);

    impersonate(nodes[0], 999);

    if (compromiseB) {
        impersonate(nodes[1], 999);
    }

    /*
     * Unrestricted admission gives four attacker identities
     * real entries in the simulator's validator set.
     */
    if (addSybilNodes) {

        for (const id of ["X1", "X2", "X3", "X4"]) {

            const node = new Node(id);

            makeByzantine(node, 999);
            nodes.push(node);
        }
    }

    console.log("Validator set");
    console.table(nodes.map(node => node.id));

    console.log(
        "Compromised identities:",
        compromiseB ? "A, B" : "A"
    );

    console.log(
        "Attacker-created identities:",
        addSybilNodes ? "X1, X2, X3, X4" : "none"
    );

    const correctQuorum =
        new QuorumEngine(nodes.length);

    console.log(
        "Correct quorum for current membership =",
        correctQuorum.size()
    );

    console.log(
        "Quorum configuration:",
        useStaleQuorum ? "STALE (original membership)" : "CURRENT"
    );

    /*
     * Simulator.runConsensus does not verify signatures.
     * Verify and freeze the exact votes here before running it.
     * The existing crypto module uses an educational secret hash,
     * not a production public-key signature scheme.
     */
    const verifier = nodes[2];

    const secretLookup = function(nodeId) {

        const sender = nodes.find(node => node.id === nodeId);

        return sender ? sender.secret : undefined;
    };

    const evidence = [];

    for (const node of nodes) {

        const vote = node.vote(100);

        const valid = verifier.verifyVote(
            vote,
            secretLookup
        );

        assert.equal(valid, true);

        evidence.push({
            nodeId: vote.nodeId,
            value: vote.value,
            signatureValid: valid
        });

        node.vote = function(_) {
            return vote;
        };
    }

    console.log("Verified vote evidence");
    console.table(evidence);

    const simulator = new Simulator(
        nodes,
        useStaleQuorum ? originalQuorum : null
    );

    return simulator.runConsensus(100);
}

/*
 * Control: a stolen A credential alone does not overturn
 * the three honest votes in this execution.
 */
const control = runExperiment(
    "CONTROL: Stolen A key only",
    false,
    false,
    false
);

assert.deepEqual(
    control.winners.map(winner => winner.value),
    ["100"]
);

/*
 * Five attacker-controlled votes versus three honest votes.
 * With quorum 6, neither value can be committed.
 */
const blocked = runExperiment(
    "PHASE 1: Sybil injection + stolen A key + current quorum",
    true,
    false,
    false
);

assert.equal(blocked.winners.length, 0);

/*
 * Exactly the same votes, but quorum remains 3.
 * Both values now qualify: this is conflicting quorum evidence,
 * not two actual commits by separate honest replicas.
 */
const conflicting = runExperiment(
    "PHASE 2: Same attack + stale quorum",
    true,
    true,
    false
);

assert.deepEqual(
    conflicting.winners.map(winner => winner.value).sort(),
    ["100", "999"]
);

/*
 * Compromising B removes one more honest vote.
 * Only the attacker value qualifies and is committed.
 * Six attacker votes also meet the correct quorum of 6;
 * stale quorum is therefore not necessary for THIS result.
 */
const captured = runExperiment(
    "PHASE 3: Additional B key theft + stale quorum",
    true,
    true,
    true
);

assert.deepEqual(
    captured.winners.map(winner => winner.value),
    ["999"]
);

console.log("\nEXPERIMENT SUMMARY");

console.table([
    {
        phase: "Control",
        votes100: 3,
        votes999: 1,
        quorum: 3,
        result: "COMMITTED: 100"
    },
    {
        phase: "1",
        votes100: 3,
        votes999: 5,
        quorum: 6,
        result: "NO CONSENSUS"
    },
    {
        phase: "2",
        votes100: 3,
        votes999: 5,
        quorum: 3,
        result: "CONFLICTING QUORUMS"
    },
    {
        phase: "3",
        votes100: 2,
        votes999: 6,
        quorum: 3,
        result: "COMMITTED: 999"
    }
]);

console.log("All expected results verified.");
console.log("Phase 1 demonstrates no commit in this execution, not permanent failure.");
console.log("Phase 2 demonstrates conflicting quorums, not two actual local commits.");
console.log("Phase 3 exceeds the fault bound even with a correctly updated quorum.");
