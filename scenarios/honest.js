const Node = require("../node");
const Simulator =
    require("../simulator");

const nodes = [

    new Node("A"),
    new Node("B"),
    new Node("C"),
    new Node("D")

];

const sim =
    new Simulator(nodes);

sim.runConsensus(100);