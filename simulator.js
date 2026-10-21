const Network = require("./network");
const QuorumEngine = require("./quorum");

class Simulator {

    constructor(
        nodes,
        customQuorumEngine = null
    ) {

        this.nodes = nodes;

        this.network =
            new Network();

        this.quorum =
            customQuorumEngine ||
            new QuorumEngine(
                nodes.length
            );
    }

    runConsensus(value) {

        console.log(
            "\n===================="
        );

        console.log(
            `Proposal: ${value}`
        );

        console.log(
            "===================="
        );

        const votes = [];

        /*
         * Request votes from all nodes
         */
        for (const node of this.nodes) {

            const vote =
                node.vote(value);

            votes.push(vote);

            console.log(
                `${node.id} voted ${vote.value}`
            );
        }

        /*
         * Count votes
         */
        const tally = {};

        for (const vote of votes) {

            tally[vote.value] =
                (tally[vote.value] || 0) + 1;
        }

        console.log("\nVote Tally");

        console.table(tally);

        console.log(
            `Required Quorum = ${this.quorum.size()}`
        );

        /*
         * Find all values that
         * satisfy quorum.
         */
        const winners = [];

        for (const candidate in tally) {

            const voteCount =
                tally[candidate];

            if (
                this.quorum.reached(
                    voteCount
                )
            ) {
                winners.push({
                    value: candidate,
                    votes: voteCount
                });
            }
        }

        /*
         * Decision
         */
        if (
            winners.length === 0
        ) {

            console.log(
                "\nNO CONSENSUS"
            );

        }
        else if (
            winners.length === 1
        ) {

            console.log(
                `\nCOMMITTED: ${winners[0].value}`
            );

        }
        else {

            console.log(
                "\nSAFETY VIOLATION!"
            );

            console.log(
                "Multiple values reached quorum:"
            );

            console.table(winners);
        }

        return {

            proposal: value,
            votes,
            tally,
            winners

        };
    }
}

module.exports = Simulator;