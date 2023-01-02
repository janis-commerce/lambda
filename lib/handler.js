'use strict';

const Events = require('@janiscommerce/events');

const Dispatcher = require('./helpers/dispatcher');
const setEnvVar = require('./helpers/set-env-var');
const Lambda = require('./lambda-bases/lambda');
const StepFunction = require('./step-function');

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
			body,
			stateMachine
		} = event;

		try {

			const data = body?.contentS3Path ? await Lambda.getBodyFromS3(body.contentS3Path) : body;

			const dispatcher = new Dispatcher(LambdaFunction, session, data, taskToken);

			dispatcher.prepare();

			await dispatcher.validate();

			setEnvVar(LambdaFunction, session, data);

			const result = await dispatcher.process();

			this.emitEnded();

			if(!stateMachine || !StepFunction.dataExceedsLimit(result?.body))
				return result;

			result.body = await Lambda.bodyToS3Path('step-function-payloads', result.body, dispatcher.payloadFixedProperties);

			return result;

		} catch(error) {

			this.emitEnded();

			throw error;
		}
	}

	static emitEnded() {
		Events.emit('janiscommerce.ended');
	}

};
