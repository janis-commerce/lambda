'use strict';

class LambdaError extends Error {

	static get codes() {
		return {
			NO_LAMBDA: 1,
			INVALID_LAMBDA: 2,
			NO_CLIENT: 3,
			INVALID_CLIENT: 4,
			NO_PAYLOAD: 5,
			NO_SERVICE: 6,
			NO_FUNCTION_NAME: 7,
			INVALID_FUNCTION_NAME: 8,
			INVALID_SESSION: 9,
			INVALID_USER: 10,
			NO_USER: 11,
			NO_SESSION: 12,
			INVALID_TASK_TOKEN: 13,
			JANIS_SECRET_MISSING: 14,
			NO_SERVICE_ACCOUNT_ID: 15,
			INVOCATION_FAILED: 16
		};
	}

	/**
	 * @param {string|Error} err
	 * @param {number} code
	 */
	constructor(err, code) {
		super(err);
		this.message = err.message || err;
		this.code = code;
		this.name = 'LambdaError';
	}
}

module.exports = LambdaError;
