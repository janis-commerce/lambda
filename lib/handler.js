'use strict';

const logger = require('lllog')();

const Events = require('@janiscommerce/events');

const Dispatcher = require('./helpers/dispatcher');
const setEnvVar = require('./helpers/set-env-var');

/**
 * @typedef {import('./lambda-bases/lambda')} Lambda
 */

/**
 * @typedef {object} AWSLambdaEvent
 */

/**
 * @typedef {object} AWSLambdaError
 * @property {string} errorType
 * @property {string} errorMessage
 */

module.exports = class Handler {

	/**
	 * To process Lambda Function
	 * @static
	 * @param {Lambda} LambdaFunction
	 * @param {AWSLambdaEvent} event
	 */
	static async handle(LambdaFunction, event = {}) {

		event = this.prepareEvent ? this.prepareEvent(event) : event;

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

		try {

			const result = await dispatcher.process();

			this.emitEnded();

			return result;

		} catch(error) {

			this.emitEnded();

			throw error;
		}
	}

	static emitEnded() {
		Events.emit('janiscommerce.ended');
	}

	/**
	 * For customize Error handling in Validate
	 * @static
	 * @param {Error} error
	 * @returns {AWSLambdaError}
	 */
	static handleValidationError(error) {

		logger.error(error);

		return {
			errorType: error.name,
			errorMessage: error.message
		};
	}
};
