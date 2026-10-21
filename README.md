# BFT Workshop: Attacks and Defenses

JavaScript experiments for **Fundamentals of System Security (COMSM0122), Workshop 2: Breaking and Understanding Byzantine Fault Tolerance**.

The project uses a simplified teaching simulator to investigate voting, quorum formation, Byzantine behavior, equivocation, key compromise, Sybil identities, and defensive controls. Parts 7 and 8 add attack experiments and hardening exercises in scenario files without modifying the shared simulator modules.

## Requirements and setup

- Node.js 18 or newer; the additional scenarios were tested with Node.js 22.11.0.
- A terminal and a code editor.

Open a terminal in the project root and run:

```sh
npm install
```

The scenarios use local modules and Node.js built-in libraries. No external service is required.

**Windows Command Prompt:** use `node.exe` explicitly. The project contains a file named `node.js`, which can take precedence over the Node executable when entering `node` and may open the editor instead.

On macOS or Linux, replace `node.exe` in the commands below with `node`. Preserve filename capitalization, including `Part7.js`.

## Project structure

```text
bft-lab/
├── README.md
├── package.json
├── package-lock.json
├── index.js
├── node.js
├── network.js
├── crypto.js
├── quorum.js
├── simulator.js
├── attacks.js
└── scenarios/
    ├── honest.js
    ├── byzantine.js
    ├── equivocation.js
    ├── key_theft.js
    ├── sybil.js
    ├── quorum_tampering.js
    ├── Part7.js
    └── part8.js
```

| Module | Responsibility |
| --- | --- |
| `node.js` | Node identities, vote generation, and vote verification |
| `network.js` | Message recording and send/broadcast helpers |
| `crypto.js` | Educational secret-based hashing and verification |
| `quorum.js` | Quorum calculation |
| `simulator.js` | Vote collection, tallying, and decision output |
| `attacks.js` | Helpers for malicious voting, equivocation, and key theft |

The directory listing focuses on executable code; accompanying workshop and report documents may also be present.

## Running the original scenarios

Run each command separately from the project root.

| Exercise | Command | Main observation |
| --- | --- | --- |
| Honest consensus | `node.exe scenarios/honest.js` | Four votes for 100 satisfy quorum 3 |
| Byzantine voting | `node.exe scenarios/byzantine.js` | Three honest votes outvote D's vote for 50 |
| Equivocation | `node.exe scenarios/equivocation.js` | D generates conflicting signed messages |
| Key theft | `node.exe scenarios/key_theft.js` | A stolen credential produces a message claiming to be A |
| Sybil identities | `node.exe scenarios/sybil.js` | X1–X4 appear in the membership list |
| Quorum tampering | `node.exe scenarios/quorum_tampering.js` | Two conflicting values each satisfy quorum 2 |

The original equivocation, key-theft, and Sybil scripts illustrate messages or membership; they do not all execute a complete voting experiment.

## Quorum and fault assumptions

The simulator computes:

```javascript
Math.floor((2 * totalNodes) / 3) + 1
```

This requires strictly more than two-thirds of the configured validators: quorum is 3 for four validators and 6 for eight.

Under the classical BFT node-count assumption, tolerating `f` Byzantine validators requires at least `3f + 1` validators, together with the other protocol and communication assumptions. Eight validators support a fault bound of at most two; they do not guarantee tolerance of five malicious identities. Tolerating five would require at least sixteen validators.

## Part 7: Breaking BFT

```sh
node.exe scenarios/Part7.js
```

The proposal remains 100. The attacker targets 999 using stolen credentials and four injected identities. Each experiment starts with fresh nodes.

| Experiment | Votes for 100 | Votes for 999 | Quorum | Expected result |
| --- | ---: | ---: | ---: | --- |
| Control: compromised A only | 3 | 1 | 3 | COMMITTED: 100 |
| Phase 1: compromised A + X1–X4 | 3 | 5 | 6 | NO CONSENSUS |
| Phase 2: same attack, stale quorum | 3 | 5 | 3 | Two conflicting values reach quorum |
| Phase 3: additionally compromise B | 2 | 6 | 3 | COMMITTED: 999 |

- **Phase 1:** uncontrolled admission and credential theft exceed the fault bound and prevent this execution from committing.
- **Phase 2:** retaining the old four-validator quorum after expansion permits conflicting quorum evidence.
- **Phase 3:** further credential compromise lets the attacker value become the only qualifying value. Six attacker votes also meet the correctly updated quorum of six, so this outcome cannot be attributed solely to the stale threshold.

Impersonated votes are explicitly verified before counting. Replacing A's vote function models control of A's outgoing vote; it does not simultaneously submit a genuine A vote.

**Scope:** conflicting quorums are demonstrated, not two actual conflicting commits at separate honest replicas. A single no-consensus execution does not establish permanent unavailability.

## Part 8: Hardening a BFT System

```sh
node.exe scenarios/part8.js
```

Five independent demonstrations follow the workshop's original task headings.

| Task | Implementation | Expected evidence |
| --- | --- | --- |
| 8.1 Detect Equivocation | Record sender, value, recipient, round, and signature; compare same-round messages | D's conflicting values are detected; a later round is kept separate |
| 8.2 Strengthen Key Protection | Revoke A after simulated key theft | Both genuine and forged A votes are blocked; B/C/D commit 100 with quorum 3 |
| 8.3 Prevent Sybil Attacks | Maintain trusted approved validators A–D | X1–X4 are rejected before counting |
| 8.4 Protect Quorum Rules | Reject thresholds below the safe minimum | Quorum 2 is rejected; a 2–2 split at quorum 3 produces no commit |
| 8.5 Build a Commit Certificate | Retain verified votes from distinct authorized signers | A certificate accompanies a commit; invalid certificates are rejected |

Task 8.2 uses the manual's revocation alternative rather than implementing key rotation. Revocation assumes external identification of compromised credentials.

Certificate checks cover insufficient signatures, duplicate signers, changed certificate values, and invalid signatures. Duplicate vote identities also stop a batch instead of increasing voting power.

The safeguards run before messages enter the shared simulator. **They apply to `part8.js`; running an original attack scenario does not automatically enable them.**

## Validation and interpreting output

The Part 7 and Part 8 scripts contain built-in assertions. Run both separately:

```sh
node.exe scenarios/Part7.js
node.exe scenarios/part8.js
```

Successful runs end with their expected-results or all-checks-passed messages. An unexpected result causes an assertion failure and a nonzero exit status.

`SAFETY VIOLATION`, rejected votes, and invalid-signature messages can be intentional test outcomes. In Task 8.4 the insecure run is shown first, followed by the protected run. In Task 8.5 invalid signatures are deliberately supplied to test rejection.

## Limitations

- This is a teaching simulator, not a production BFT protocol or blockchain.
- Decisions use a synchronous global tally, without independent replica commit state, view changes, or a full network partition model.
- The base simulator does not automatically verify signatures, restrict membership, or deduplicate sender identities.
- The crypto module hashes an identity, value, and predictable shared secret; it is not a production public-key signature scheme.
- Round and recipient metadata are not bound into signatures. Certificates and evidence are scoped to the isolated exercises, without cryptographic replay protection.
- Evidence sharing, trusted registries, and authorized revocation are assumed. Key theft is not detected automatically.
- A commit certificate records support; it does not prove that signers are honest or that application data is valid.

## Acknowledgements

The original workshop simulator and exercises are supplied for COMSM0122, Workshop 2. The package metadata credits Inah Omororonyia as the original author. The Part 7 and Part 8 scenario files extend that teaching framework for the workshop submission.

