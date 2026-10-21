const Node = require("../node");
const Simulator = require("../simulator");
const QuorumEngine = require("../quorum");
const assert = require("node:assert/strict");

const {
    makeEquivocator,
    stealKey,
    forgeVote
} = require("../attacks");

function heading(title) {

    console.log("\n========================================");
    console.log(title);
    console.log("========================================");
}

function createNodes() {

    return ["A", "B", "C", "D"].map(
        id => new Node(id)
    );
}

/*
 * Scenario-local safeguards. Shared modules remain unchanged.
 * One instance holds a trusted membership and key registry.
 */
class Defenses {

    constructor(nodes) {

        this.approvedValidators = nodes.map(node => node.id);

        this.keys = new Map(
            nodes.map(node => [node.id, node.secret])
        );

        this.verifier = nodes[0];
        this.revoked = new Set();
        this.equivocationLog = [];
    }

    authenticate(vote) {

        if (!this.approvedValidators.includes(vote.nodeId)) {
            return false;
        }

        return this.verifier.verifyVote(
            vote,
            id => this.keys.get(id)
        );
    }

    acceptVote(vote) {

        if (!this.approvedValidators.includes(vote.nodeId)) {

            console.log("REJECTED unknown validator:", vote.nodeId);
            return false;
        }

        if (this.revoked.has(vote.nodeId)) {

            console.log("REJECTED revoked identity:", vote.nodeId);
            return false;
        }

        if (!this.authenticate(vote)) {

            console.log("REJECTED invalid signature:", vote.nodeId);
            return false;
        }

        return true;
    }

    /*
     * Task 8.1: compare verified evidence in the same round.
     * Round and recipient are trusted scenario metadata here.
     * Existing signatures do not cryptographically bind this metadata.
     */
    recordEvidence(vote, recipient, round) {

        if (!this.acceptVote(vote)) {
            return false;
        }

        const conflict = this.equivocationLog.some(
            entry =>
                entry.round === round &&
                entry.nodeId === vote.nodeId &&
                entry.value !== vote.value
        );

        this.equivocationLog.push({
            round,
            nodeId: vote.nodeId,
            value: vote.value,
            recipient,
            signature: vote.signature
        });

        if (conflict) {

            console.log(
                "EQUIVOCATION DETECTED:",
                vote.nodeId,
                "round",
                round
            );
        }

        return conflict;
    }

    /*
     * Task 8.2: revoke an identity after external theft detection.
     * Genuine and forged messages under that identity are both blocked.
     */
    revoke(nodeId) {

        this.revoked.add(nodeId);
        console.log("REVOKED:", nodeId);
    }

    /*
     * Task 8.4: trusted membership determines the minimum.
     * Missing or revoked votes do not lower the threshold.
     */
    validateQuorum(quorumSize) {

        const totalNodes = this.approvedValidators.length;

        const minimum = Math.floor(
            (2 * totalNodes) / 3
        ) + 1;

        if (
            !Number.isInteger(quorumSize) ||
            quorumSize < minimum ||
            quorumSize > totalNodes
        ) {
            throw Error("Unsafe quorum size: " + quorumSize);
        }

        return quorumSize;
    }

    /*
     * Task 8.5: verify unique, authorized signatures for one value.
     * Certificates apply only to this isolated single-round exercise.
     */
    verifyCertificate(certificate, quorumSize) {

        this.validateQuorum(quorumSize);

        if (
            !certificate ||
            !Array.isArray(certificate.signatures)
        ) {
            return false;
        }

        const signers = new Set();

        for (const vote of certificate.signatures) {

            if (
                vote.value !== certificate.value ||
                signers.has(vote.nodeId) ||
                !this.acceptVote(vote)
            ) {
                return false;
            }

            signers.add(vote.nodeId);
        }

        return signers.size >= quorumSize;
    }

    /*
     * Enforce checks before the unchanged simulator counts messages.
     * A repeated sender stops this batch instead of gaining extra votes.
     */
    runConsensus(messages, proposal, quorumSize) {

        this.validateQuorum(quorumSize);

        const accepted = [];
        const seen = new Set();

        for (const vote of messages) {

            if (!this.acceptVote(vote)) {
                continue;
            }

            if (seen.has(vote.nodeId)) {
                throw Error("Duplicate vote identity: " + vote.nodeId);
            }

            seen.add(vote.nodeId);
            accepted.push(Object.freeze({ ...vote }));
        }

        const inputs = accepted.map(vote => ({

            id: vote.nodeId,

            vote: function(_) {
                return vote;
            }
        }));

        const quorum = {

            size() {
                return quorumSize;
            },

            reached(voteCount) {
                return voteCount >= quorumSize;
            }
        };

        const simulator = new Simulator(inputs, quorum);
        const result = simulator.runConsensus(proposal);

        let certificate = null;

        if (result.winners.length === 1) {

            const winner = result.winners[0];

            const signatures = accepted.filter(
                vote => String(vote.value) === winner.value
            );

            certificate = {
                value: signatures[0].value,
                signatures
            };

            assert.equal(
                this.verifyCertificate(certificate, quorumSize),
                true
            );

            console.log("COMMIT CERTIFICATE");
            console.log("Value =", certificate.value);
            console.log(
                "Signed by:",
                signatures.map(vote => vote.nodeId).join(" ")
            );
            console.dir(certificate, { depth: null });
        }
        else {
            console.log("NO COMMIT CERTIFICATE");
        }

        return { result, certificate };
    }
}

function task81() {

    heading("Task 8.1: Detect Equivocation");

    const nodes = createNodes();
    const defense = new Defenses(nodes);
    const nodeD = nodes[3];

    makeEquivocator(nodeD, {
        A: 100,
        B: 50,
        C: 75
    });

    console.log("BEFORE: each recipient sees one valid signed message.");

    for (const recipient of ["A", "B", "C"]) {

        const vote = nodeD.voteForPeer(recipient);

        assert.equal(defense.authenticate(vote), true);

        console.log(
            "D ->",
            recipient,
            "value =",
            vote.value,
            "signature valid = true"
        );
    }

    console.log("AFTER: recipients share their evidence.");

    assert.equal(
        defense.recordEvidence(nodeD.voteForPeer("A"), "A", 1),
        false
    );

    assert.equal(
        defense.recordEvidence(nodeD.voteForPeer("B"), "B", 1),
        true
    );

    assert.equal(
        defense.recordEvidence(nodeD.voteForPeer("C"), "C", 1),
        true
    );

    console.table(defense.equivocationLog);

    // A different value in a later round is not automatically equivocation.
    assert.equal(
        defense.recordEvidence(nodeD.vote(200), "A", 2),
        false
    );

    console.log("PASS: conflicting round-1 messages detected; round 2 kept separate.");
}

function task82() {

    heading("Task 8.2: Strengthen Key Protection");

    const nodes = createNodes();
    const defense = new Defenses(nodes);

    const forged = forgeVote(
        "A",
        stealKey(nodes[0]),
        999
    );

    console.log(
        "BEFORE revocation: forged signature valid =",
        defense.authenticate(forged)
    );

    assert.equal(defense.acceptVote(forged), true);

    defense.revoke("A");

    // Signature mathematics still succeeds, but policy rejects the identity.
    assert.equal(defense.authenticate(forged), true);
    assert.equal(defense.acceptVote(forged), false);
    assert.equal(defense.acceptVote(nodes[0].vote(100)), false);

    const run = defense.runConsensus(
        [forged, ...nodes.slice(1).map(node => node.vote(100))],
        100,
        3
    );

    assert.equal(run.certificate.value, 100);
    assert.deepEqual(
        run.certificate.signatures.map(vote => vote.nodeId),
        ["B", "C", "D"]
    );

    console.log("PASS: revoked A cannot vote; B,C,D still commit with quorum 3.");
}

function task83() {

    heading("Task 8.3: Prevent Sybil Attacks");

    const nodes = createNodes();
    const defense = new Defenses(nodes);

    const sybils = ["X1", "X2", "X3", "X4"].map(
        id => new Node(id)
    );

    console.log("Attempted identities:");
    console.table([...nodes, ...sybils].map(node => node.id));

    const messages = [
        ...nodes.map(node => node.vote(100)),
        ...sybils.map(node => node.vote(999))
    ];

    const run = defense.runConsensus(messages, 100, 3);

    assert.equal(run.result.votes.length, 4);
    assert.equal(run.result.tally["999"], undefined);
    assert.equal(run.certificate.value, 100);

    console.log("PASS: X1-X4 receive no voting power.");
}

function task84() {

    heading("Task 8.4: Protect Quorum Rules");

    const nodes = createNodes();
    const defense = new Defenses(nodes);

    const splitVotes = nodes.map(
        (node, index) => node.vote(index < 2 ? 100 : 50)
    );

    console.log("BEFORE: quorum 2 allows both 100 and 50.");

    const replay = splitVotes.map(vote => ({
        id: vote.nodeId,
        vote: function(_) {
            return vote;
        }
    }));

    const weakQuorum = {
        size() {
            return 2;
        },
        reached(voteCount) {
            return voteCount >= 2;
        }
    };

    const unsafe = new Simulator(replay, weakQuorum).runConsensus(100);

    assert.equal(unsafe.winners.length, 2);

    console.log("AFTER: unsafe configuration rejected before counting.");

    assert.throws(
        () => defense.runConsensus(splitVotes, 100, 2),
        /Unsafe quorum size/
    );

    console.log("REJECTED: Unsafe quorum size: 2");

    const safe = defense.runConsensus(splitVotes, 100, 3);

    assert.equal(safe.result.winners.length, 0);
    assert.equal(safe.certificate, null);

    console.log("PASS: quorum 3 prevents conflicting values from qualifying here.");
}

function task85() {

    heading("Task 8.5: Build a Commit Certificate");

    const nodes = createNodes();
    const defense = new Defenses(nodes);

    const run = defense.runConsensus(
        nodes.map(node => node.vote(100)),
        100,
        new QuorumEngine(nodes.length).size()
    );

    assert.equal(run.certificate.value, 100);

    const insufficient = {
        value: 100,
        signatures: run.certificate.signatures.slice(0, 2)
    };

    assert.equal(
        defense.verifyCertificate(insufficient, 3),
        false
    );

    const duplicate = {
        value: 100,
        signatures: [
            run.certificate.signatures[0],
            run.certificate.signatures[0],
            run.certificate.signatures[0]
        ]
    };

    assert.equal(
        defense.verifyCertificate(duplicate, 3),
        false
    );

    const tampered = {
        value: 999,
        signatures: run.certificate.signatures
    };

    assert.equal(
        defense.verifyCertificate(tampered, 3),
        false
    );

    const badSignature = {
        value: 100,
        signatures: run.certificate.signatures.map(
            vote => ({ ...vote, signature: "invalid" })
        )
    };

    assert.equal(
        defense.verifyCertificate(badSignature, 3),
        false
    );

    assert.throws(
        () => defense.runConsensus(
            [nodes[0].vote(100), nodes[0].vote(100)],
            100,
            3
        ),
        /Duplicate vote identity/
    );

    console.log("PASS: valid certificate accepted.");
    console.log("PASS: insufficient, duplicate, altered-value and invalid-signature certificates rejected.");
    console.log("PASS: duplicate votes cannot inflate consensus counts.");
}

task81();
task82();
task83();
task84();
task85();

heading("Part 8: All checks passed");

console.log("8.1: equivocation detected using shared evidence.");
console.log("8.2: key revocation blocks future votes under the revoked identity.");
console.log("8.3: unapproved validators cannot vote.");
console.log("8.4: unsafe quorum configurations are rejected.");
console.log("8.5: commits include verified signatures from distinct validators.");

console.log("\nRemaining limitations:");
console.log("- Shared evidence and trusted round metadata are assumed.");
console.log("- Revocation requires external detection and trusted administration.");
console.log("- Membership and verification-key registries must be protected.");
console.log("- Certificates provide evidence, not proof that signers are honest.");
console.log("- Existing secret hashes are educational, not public-key signatures.");
console.log("- No distributed recovery or cryptographic round/replay protection is implemented.");

