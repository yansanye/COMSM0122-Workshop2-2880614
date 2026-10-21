const Node = require("../node");

const {
    makeEquivocator
} = require("../attacks");

const nodeD =
    new Node("D");

makeEquivocator(nodeD, {

    A: 100,
    B: 50,
    C: 75
});

console.log(
    nodeD.voteForPeer("A")
);

console.log(
    nodeD.voteForPeer("B")
);

console.log(
    nodeD.voteForPeer("C")
);