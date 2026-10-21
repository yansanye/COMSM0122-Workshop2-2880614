const Node = require("../node");
const Simulator = require("../simulator");

const {
    makeByzantine
} = require("../attacks");

const nodes = [

    new Node("A"),
    new Node("B"),
    new Node("C"),
    new Node("D")
];

makeByzantine(
    nodes[3],
    50
);

const sim =
    new Simulator(nodes);

sim.runConsensus(100);