'use strict';

module.exports = class StepFunctionsError extends Error {

	static get codes() {
		return {
			INVALID_ARN: 1,
			INVALID_NAME: 2,
			INVALID_CLIENT: 3,
			INVALID_DATA: 4
		};
	}

	/**
	 * @param {string|Error} err
	 * @param {number} code
	 */
	constructor(err, code) {

		super(err.message || err);

		this.name = 'StepFunctionsError';
		this.code = code;
	}

};
