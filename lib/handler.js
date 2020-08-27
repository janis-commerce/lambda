'use strict';

const logger = require('lllog')();

const Dispatcher = require('./helpers/dispatcher');
const setEnvVar = require('./helpers/set-env-var');

module.exports = class Handler {

	/**
	 * To process Lambda Function
	 * @param {Class} LambdaFunction
	 * @param {object} event
	 */
	static async handle(LambdaFunction, event = {}) {

		const {
			session,
			body: data
		} = event;

		let dispatcher;

		try {

			dispatcher = new Dispatcher(LambdaFunction, session, data);
			dispatcher.prepare();
			await dispatcher.validate();

		} catch(error) {
			return this.handleValidationError(error);
		}

		setEnvVar(LambdaFunction, session, data);

		return dispatcher.process();
	}

	/**
	 * For customize Error handling in Validate
	 * @param {Error} error
	 */
	static handleValidationError(error) {

		logger.error(error);

		return {
			errorType: error.name,
			errorMessage: error.message
		};
	}
};
