'use strict';

const { ApiSession } = require('@janiscommerce/api-session');

const LambdaError = require('./lambda-error');

const AWSLambda = require('./helpers/lambda-wrapper');
const getLambdaFunctionName = require('./helpers/get-lambda-function-name');

/**
 * @typedef InvokeResponse
 * @property {number} StatusCode
 * @property {string} Payload
 */

module.exports = class Invoker {

	/**
	 * @private
	 * @static
	 */
	static get lambda() {

		if(!this._lambda) {
			/** @private */
			this._lambda = new AWSLambda();
		}

		return this._lambda;
	}

	/**
	 * @private
	 * @static
	 */
	static get invocationType() {
		return 'Event';
	}

	/**
	 * Invoke a Lambda Function
	 * @static
	 * @param {string} functionName
	 * @param {object|Array<object>} body The invocation body (or array of bodies)
	 * @returns {Promise<Array<InvokeResponse>>} Invocations results
	 */
	static async call(functionName, body) {

		this.validateFunctionName(functionName);

		const bodies = this.getBodies(body);

		const payloads = this.generateSessionsAndPayloadsCombinations([undefined], bodies);

		const invokeParams = this.getInvokeBasicParams(functionName);

		return Promise.all(payloads.map(payload => this.lambda.invoke({
			...invokeParams,
			...(payload && { Payload: payload })
		})));
	}

	/**
	 * Invoke a Lambda Function by Clients
	 * @static
	 * @param {string} functionName
	 * @param {string|Array<string>|object|Array<object>} session An ApiSession object or a client code string
	 * @param {object|Array<object>} payload The invocation body (or array of bodies)
	 * @returns {Promise<Array<InvokeResponse>>} Invocations results
	 */
	static async clientCall(functionName, session, body) {

		this.validateFunctionName(functionName);

		const sessions = this.validateAndEnsureClientSessions(session);

		const bodies = this.getBodies(body);

		const payloads = this.generateSessionsAndPayloadsCombinations(sessions, bodies);

		const invokeParams = this.getInvokeBasicParams(functionName);

		return Promise.all(payloads.map(payload => this.lambda.invoke({
			...invokeParams,
			Payload: payload
		})));
	}

	/**
	 * Invoke the Lambda Function where it is call with the same payload and client if has any
	 * @static
	 * @returns {Promise<InvokeResponse>} Invocation result
	 */
	static async recall() {

		const invokeParams = {
			FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
			InvocationType: this.invocationType
		};

		if(process.env.JANIS_LAMBDA_PAYLOAD)
			invokeParams.Payload = process.env.JANIS_LAMBDA_PAYLOAD;

		return this.lambda.invoke(invokeParams);
	}

	/**
	 * @private
	 * @static
	 * @param {string} functionName
	 */
	static validateFunctionName(functionName) {

		if(!functionName)
			throw new LambdaError('Invoker needs a function name', LambdaError.codes.NO_FUNCTION_NAME);

		if(typeof functionName !== 'string')
			throw new LambdaError('Invalid function name, must be a non-empty string', LambdaError.codes.INVALID_FUNCTION_NAME);
	}

	/**
	 * @private
	 * @static
	 * @param {string|ApiSession} functionName
	 */
	static isValidClientSession(session) {

		if(!session)
			return false;

		if(typeof session === 'string')
			return true;

		return session instanceof ApiSession && !!session.clientCode;
	}

	/**
	 * @private
	 * @static
	 */
	static validateAndEnsureClientSessions(session) {

		if(!session || (Array.isArray(session) && !session.length))
			throw new LambdaError('Invoker needs at least one session', LambdaError.codes.NO_SESSION);

		const sessions = Array.isArray(session) ? session : [session];

		return sessions.map(s => {

			if(!this.isValidClientSession(s))
				throw new LambdaError('Invalid Session. Session must be a non-empty string or a session object', LambdaError.codes.INVALID_SESSION);

			return s instanceof ApiSession ? s : new ApiSession({ clientCode: s });
		});
	}

	/**
	 * @private
	 * @static
	 */
	static getInvokeBasicParams(functionName) {

		return {
			FunctionName: getLambdaFunctionName(functionName),
			InvocationType: this.invocationType
		};
	}

	/**
	 * @private
	 * @static
	 */
	static getBodies(payload) {

		let payloads;

		if(!Array.isArray(payload))
			payloads = [payload];
		else
			payloads = !payload.length ? [null] : payload;

		return payloads.map(body => {

			if(!body || (typeof body === 'object' && !Object.keys(body).length))
				return null;

			return body;
		});
	}

	/**
	 * @private
	 * @static
	 */
	static generateSessionsAndPayloadsCombinations(sessions, bodies) {

		// https://en.wikipedia.org/wiki/Cartesian_product
		const product = [];

		sessions.forEach(session => {

			const formattedSession = session && session.authenticationData;

			bodies.forEach(body => {

				if(!formattedSession && !body)
					return product.push(null);

				product.push(JSON.stringify({
					session: formattedSession,
					...(body && { body })
				}));
			});
		});

		return product;
	}
};
