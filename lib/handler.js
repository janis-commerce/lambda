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

			const data = await this.getFullData(body);

			const dispatcher = new Dispatcher(LambdaFunction, session, data, taskToken);

			dispatcher.prepare();

			await dispatcher.validate();

			setEnvVar(LambdaFunction, session, data);

			const result = await dispatcher.process();

			await this.emitEnded();

			if(!stateMachine)
				return result;

			if(StepFunction.dataExceedsLimit(result?.body))
				result.body = await Lambda.bodyToS3Path('step-function-payloads', result.body, dispatcher.payloadFixedProperties);

			['body', 'session'].forEach(defaultField => {
				if(result[defaultField] === undefined)
					result[defaultField] = null;
			});

			return {
				...result,
				stateMachine
			};

		} catch(error) {

			await this.emitEnded();

			throw error;
		}
	}

	static getFullData(body) {
		return body?.contentS3Path ? Lambda.getBodyFromS3(body.contentS3Path) : body;
	}

	static async emitEnded() {
		await Events.emit('janiscommerce.ended');
	}

};
