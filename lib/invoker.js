'use strict';

const LambdaError = require('./lambda-error');

const Lambda = require('./helpers/lambda-wrapper');
const getLambdaFunctionName = require('./helpers/get-lambda-function-name');

module.exports = class Invoker {

	static get lambda() {

		if(!this._lambda)
			this._lambda = new Lambda();

		return this._lambda;
	}

	static get invocationType() {
		return 'Event';
	}

	/**
	 * Invoke a Lambda Function
	 * @async
	 * @param {string} functionName
	 * @param {any|Array<any>} payload a single value or an Array of values
	 * @returns {object} with StatusCode and Payload fields
	 */
	static call(functionName, payload) {

		this.validateFunctionName(functionName);

		const invokeParams = this.getInvokeBasicParams(functionName);

		if(!payload)
			return this.lambda.invoke(invokeParams);

		const payloads = this.getPayloads(payload);

		return Promise.all(payloads.map(body => this.lambda.invoke({
			...invokeParams,
			Payload: JSON.stringify({ body })
		})));
	}

	/**
	 * Invoke a Lambda Function by Clients
	 * @async
	 * @param {string} functionName
	 * @param {string|Array<string>} clientCode
	 * @param {any|Array<any>} payload a single value or an Array of values
	 * @returns {object} with StatusCode and Payload fields
	 */
	static clientCall(functionName, clientCode, payload) {

		this.validateFunctionName(functionName);
		this.validateClients(clientCode);

		const clients = this.getClients(clientCode);
		const payloads = payload && this.getPayloads(payload);

		const clientsFormatted = this.formatClients(clients, payloads);

		return Promise.all(clientsFormatted.map(Payload => this.lambda.invoke({
			...this.getInvokeBasicParams(functionName),
			Payload
		})));
	}

	/**
	 * Invoke the Lambda Function where it is call with the same payload and client if has any
	 * @returns {object} with StatusCode and Payload fields
	 */
	static recall() {

		const invokeParams = {
			FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
			InvocationType: 'Event'
		};

		if(process.env.JANIS_LAMBDA_PAYLOAD)
			invokeParams.Payload = process.env.JANIS_LAMBDA_PAYLOAD;

		return this.lambda.invoke(invokeParams);
	}

	static validateFunctionName(functionName) {

		if(!functionName)
			throw new LambdaError('Invoker needs a function name', LambdaError.codes.NO_FUNCTION_NAME);

		if(typeof functionName !== 'string' || !functionName.length)
			throw new LambdaError('Invalid function name, must be a non-empty string', LambdaError.codes.INVALID_FUNCTION_NAME);
	}

	static validateClients(clients) {

		if(!clients)
			throw new LambdaError('Invoker needs at least one client code', LambdaError.codes.NO_CLIENT);

		if(!Array.isArray(clients) && (typeof clients !== 'string' || !clients.length))
			throw new LambdaError('Invalid Client. Code must be a non-empty string', LambdaError.codes.INVALID_CLIENT);

		if(Array.isArray(clients) && !clients.length)
			throw new LambdaError('Invalid Client. List must not be empty', LambdaError.codes.NO_CLIENT);

		if(Array.isArray(clients) && clients.some(client => typeof client !== 'string'))
			throw new LambdaError('Invalid Client. List must have strings', LambdaError.codes.INVALID_CLIENT);
	}

	static getInvokeBasicParams(functionName) {

		return {
			FunctionName: getLambdaFunctionName(functionName),
			InvocationType: this.invocationType
		};
	}

	static getClients(clientCode) {

		const clients = !Array.isArray(clientCode) ? [clientCode] : clientCode;

		return clients.map(__clientCode => ({ __clientCode }));
	}

	static getPayloads(payload) {

		return !Array.isArray(payload) ? [payload] : payload;
	}

	static formatClients(clients, payloads) {

		return clients.reduce((clientsFormatted, client) => {

			if(!payloads)
				return [...clientsFormatted, JSON.stringify(client)];

			return [
				...clientsFormatted,
				...payloads.map(body => (JSON.stringify({
					...client,
					body
				})))
			];
		}, []);

	}
};
