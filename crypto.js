const crypto = require("crypto");

function sign(nodeId, value, secret) {
    return crypto
        .createHash("sha256")
        .update(`${nodeId}:${value}:${secret}`)
        .digest("hex");
}

function verify(nodeId, value, secret, signature) {
    const expected = sign(nodeId, value, secret);
    return expected === signature;
}

module.exports = { sign, verify };