const { sign } = require("./crypto");

/*
 * Honest behaviour
 */
function resetNode(node) {

    node.vote = function(value) {

        return {
            nodeId: this.id,
            value,
            signature: sign(
                this.id,
                value,
                this.secret
            )
        };
    };
}

/*
 * Byzantine node:
 * always votes for maliciousValue
 */
function makeByzantine(node, maliciousValue) {

    node.vote = function(_) {

        return {
            nodeId: this.id,
            value: maliciousValue,
            signature: sign(
                this.id,
                maliciousValue,
                this.secret
            )
        };
    };
}

/*
 * Equivocation:
 * sends different values to different peers
 */
function makeEquivocator(node, valuesPerPeer) {

    node.voteForPeer = function(peerId) {

        const value =
            valuesPerPeer[peerId];

        return {
            nodeId: this.id,
            value,
            signature: sign(
                this.id,
                value,
                this.secret
            )
        };
    };
}

/*
 * Key theft.
 * Returns stolen secret.
 */
function stealKey(node) {

    return node.secret;
}

/*
 * Create forged vote.
 */
function forgeVote(
    victimNodeId,
    stolenSecret,
    value
) {

    return {
        nodeId: victimNodeId,
        value,
        signature: sign(
            victimNodeId,
            value,
            stolenSecret
        )
    };
}

module.exports = {

    resetNode,
    makeByzantine,
    makeEquivocator,
    stealKey,
    forgeVote
};