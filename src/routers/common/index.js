const { PermissionError, NotFoundError, BadRequest } = require('../../exceptions');

function responseException(res, err, code) {
    if (err instanceof PermissionError) {
        res.status(401).send({ error: err.message, code: 401 });
    } else if (err instanceof NotFoundError) {
        res.status(404).send({ error: err.message, document: err.document });
    } else if (err instanceof BadRequest) {
        res.status(400).send({ error: err.message });
    } else {
        res.status(code).send({ error: err.message });
    }
}

module.exports = {
    responseException
};