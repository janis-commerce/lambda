'use strict';

const logger = require('lllog')();

const Dispatcher = require('./dispatcher');

module.exports = class Handler {

	/**
	 * To process Lambda Function
	 * @param {Class} LambdaFunction
	 * @param {object} events
	 */
	static async handle(LambdaFunction, events = {}) {

		const { __clientCode: clientCode, body: data } = events;

		let dispatcher;

		try {

			dispatcher = new Dispatcher(LambdaFunction, clientCode, data);
			dispatcher.prepare();
			await dispatcher.validate();

		} catch(error) {
			return this.handleValidationError(error);
		}

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
