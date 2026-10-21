const Node = require("../node");

const nodes = [

    new Node("A"),
    new Node("B"),
    new Node("C"),
    new Node("D")
];

console.log(
    "Original validator set"
);

console.table(
    nodes.map(n => n.id)
);

/*
 * Attacker creates
 * fake validators
 */

nodes.push(
    new Node("X1")
);

nodes.push(
    new Node("X2")
);

nodes.push(
    new Node("X3")
);

nodes.push(
    new Node("X4")
);

console.log(
    "After Sybil attack"
);

console.table(
    nodes.map(n => n.id)
);