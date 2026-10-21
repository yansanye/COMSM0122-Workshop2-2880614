class QuorumEngine {

    constructor(totalNodes) {

        this.totalNodes =
            totalNodes;
    }

    size() {
        return Math.floor(
            (2 * this.totalNodes) / 3
        ) + 1;
    }

    reached(voteCount) {

        return voteCount >=
               this.size();
    }
}

module.exports = QuorumEngine;