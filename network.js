class Network {

    constructor() {
        this.messages = [];
    }

    send(from, to, message) {

        this.messages.push({
            from,
            to,
            message
        });

        console.log(
            `${from} -> ${to}`,
            message
        );
    }

    broadcast(sender, nodes, message) {

        nodes.forEach(node => {

            this.send(
                sender,
                node.id,
                message
            );

        });
    }
}

module.exports = Network;