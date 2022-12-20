'use strict';

const Events = require('@janiscommerce/events');

const Dispatcher = require('./helpers/dispatcher');
const setEnvVar = require('./helpers/set-env-var');

/**
 * @typedef {import('./lambda-bases/lambda')} Lambda
 */

/**
 * @typedef {object} AWSLambdaEvent
 * @property {string?} taskToken
 * @property {import('@janiscommerce/api-session').ApiSession.AuthenticationData} session
 * @property {unknown} body
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
			taskToken,
			session,
			body: data
		} = event;

		try {

			const dispatcher = new Dispatcher(LambdaFunction, session, data, taskToken);

			dispatcher.prepare();

			await dispatcher.validate();

			setEnvVar(LambdaFunction, session, data);

			const result = await dispatcher.process();

			await this.emitEnded();

			return result;

		} catch(error) {

			await this.emitEnded();

			throw error;
		}
	}

	static async emitEnded() {
		await Events.emit('janiscommerce.ended');
	}

};
