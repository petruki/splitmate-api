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

class PermissionError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends Error {
    constructor(document) {
        super(`'${document}' not found`);
        this.name = this.constructor.name;
        this.document = document;
        Error.captureStackTrace(this, this.constructor);
    }
}

class BadRequest extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    responseException,
    PermissionError,
    NotFoundError,
    BadRequest
}