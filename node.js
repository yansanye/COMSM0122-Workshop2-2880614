const { sign, verify } = require("./crypto");

class Node {

    constructor(id, honest=true) {
        this.id = id;
        this.honest = honest;

        this.secret = `secret-${id}`;

        this.publicInfo = {
            id: this.id
        };
    }

    vote(value) {

        return {
            nodeId: this.id,
            value,
            signature: sign(
                this.id,
                value,
                this.secret
            )
        };
    }

    verifyVote(vote, secretLookup) {

        return verify(
            vote.nodeId,
            vote.value,
            secretLookup(vote.nodeId),
            vote.signature
        );
    }
}

module.exports = Node;