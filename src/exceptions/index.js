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
    PermissionError,
    NotFoundError,
    BadRequest
};