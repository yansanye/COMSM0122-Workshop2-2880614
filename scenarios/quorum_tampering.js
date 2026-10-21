const Node = require("../node");
const Simulator =
    require("../simulator");

/*
 * Deliberately broken quorum rule
 */
class WeakQuorum {

    size() {
        return 2;
    }

    reached(voteCount) {
        return voteCount >= 2;
    }
}

const nodes = [

    new Node("A"),
    new Node("B"),
    new Node("C"),
    new Node("D")

];

/*
 * Force split vote
 */
nodes[0].vote = () => ({
    nodeId: "A",
    value: 100
});

nodes[1].vote = () => ({
    nodeId: "B",
    value: 100
});

nodes[2].vote = () => ({
    nodeId: "C",
    value: 50
});

nodes[3].vote = () => ({
    nodeId: "D",
    value: 50
});

const simulator =
    new Simulator(
        nodes,
        new WeakQuorum()
    );

simulator.runConsensus(100);