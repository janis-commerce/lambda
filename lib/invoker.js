'use strict';

const { ApiSession } = require('@janiscommerce/api-session');

const LambdaError = require('./lambda-error');

const SecretFetcher = require('./helpers/secret-fetcher');

const LambdaInstance = require('./helpers/lambda-instance');
const getLambdaFunctionName = require('./helpers/get-lambda-function-name');

const { isObjectNotEmpty } = require('./helpers/is-object');

const isLocalEnv = require('./helpers/is-local-env');
const getApiLambdaFunctionName = require('./helpers/get-api-lambda-function-name');
const getLocalServicePort = require('./helpers/get-local-service-port');

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
		return LambdaInstance.getInstance({ useLocalEndpoint: isLocalEnv() });
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
	 * Invoke a Lambda Function from external service
	 * @static
	 * @param {string} serviceCode The Janis service code
	 * @param {string} functionName
	 * @param {object} body The invocation body
	 * @param {object} sessionData
	 * @param {string|object} sessionData.session An ApiSession object or a client code string
	 * @returns {Promise<object>} Invocation response
	 */
	static async serviceSafeCall(serviceCode, functionName, body, sessionData) {

		this.validateServiceCode(serviceCode);
		this.validateFunctionName(functionName);

		let session;

		if(sessionData)
			[session] = this.validateAndEnsureClientSessions(sessionData.session);

		body = isObjectNotEmpty(body) ? body : null;

		const [payload] = this.generateSessionsAndPayloadsCombinations([session], [body]);

		const serviceAccountId = await this.getServiceAccountId(serviceCode);

		const invokeParams = this.getInvokeServiceParams(functionName, serviceAccountId, serviceCode);

		const lambdaInstance = await this.getServiceLambdaInstance(serviceAccountId, serviceCode);

		const invokeResponse = await lambdaInstance.invoke({
			...invokeParams,
			...(payload && { Payload: payload })
		});

		return this.formatInvokeResponse(invokeResponse);
	}

	/**
	 * Invoke a Lambda Function from external service
	 * @static
	 * @param {string} serviceCode The Janis service code
	 * @param {string} functionName
	 * @param {object} body The invocation body
	 * @returns {Promise<object>} Invocation response
	 * @throws {LambdaError} when the invocation fails or the response code is an error
	 */
	static async serviceCall(serviceCode, functionName, body) {

		const invokeResponse = await this.serviceSafeCall(serviceCode, functionName, body);

		if(invokeResponse.statusCode >= 400) {
			throw new LambdaError(
				`Failed to invoke function '${functionName}' from service '${serviceCode}': ${invokeResponse.functionError || 'No error details'}`,
				LambdaError.codes.INVOCATION_FAILED
			);
		}

		return invokeResponse;
	}

	/**
	 * Invoke a Lambda Function from external service by Client
	 * @static
	 * @param {string} serviceCode The Janis service code
	 * @param {string} functionName
	 * @param {string|object} session An ApiSession object or a client code string
	 * @param {object} payload The invocation body
	 * @returns {Promise<object>} Invocation response
	 */
	static async serviceSafeClientCall(serviceCode, functionName, session, body) {
		return this.serviceSafeCall(serviceCode, functionName, body, { session });
	}

	/**
	 * Invoke a Lambda Function from external service by Client
	 * @static
	 * @param {string} serviceCode The Janis service code
	 * @param {string} functionName
	 * @param {string|object} session An ApiSession object or a client code string
	 * @returns {Promise<object>} Invocation response
	 * @throws {LambdaError} when the invocation fails or the response code is an error
	 */
	static async serviceClientCall(serviceCode, functionName, session, body) {

		const invokeResponse = await this.serviceSafeClientCall(serviceCode, functionName, session, body);

		if(invokeResponse.statusCode >= 400) {
			throw new LambdaError(
				`Failed to invoke function '${functionName}' from service '${serviceCode}': ${invokeResponse.functionError || 'No error details'}`,
				LambdaError.codes.INVOCATION_FAILED
			);
		}

		return invokeResponse;
	}

	/**
	 * Invoke a Lambda Function that its an API from external service
	 * @static
	 * @param {string} serviceCode The Janis service code
	 * @param {string} functionName
	 * @param {string} namespace
	 * @param {string} method
	 * @param {object} event
	 * @returns {Promise<object>} Invocation response formatted by sls-api-response package
	 */
	static async apiCall(serviceCode, functionName, namespace, method, event = {}) {

		this.validateServiceCode(serviceCode);
		this.validateFunctionName(functionName);
		this.validateEndpoint(serviceCode, functionName, namespace, method);

		const serviceAccountId = await this.getServiceAccountId(serviceCode);

		const lambdaInstance = await this.getServiceLambdaInstance(serviceAccountId, serviceCode);

		return lambdaInstance.invoke({
			FunctionName: getApiLambdaFunctionName(functionName, serviceAccountId, serviceCode),
			InvocationType: 'RequestResponse',
			Payload: {
				namespace,
				method,
				body: event
			}
		});
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
	 * @param {string} serviceCode
	 */
	static validateServiceCode(serviceCode) {

		if(!serviceCode)
			throw new LambdaError('Service code is required', LambdaError.codes.NO_SERVICE_CODE);

		if(typeof serviceCode !== 'string')
			throw new LambdaError('Invalid service code, must be a non-empty string', LambdaError.codes.INVALID_SERVICE_CODE);
	}

	/**
	 * @private
	 * @static
	 * @param {string} serviceCode
	 * @param {string} functionName
	 * @param {string} namespace
	 * @param {string} method
	 */
	static validateEndpoint(serviceCode, functionName, namespace, method) {

		if(!namespace || !method) {
			throw new LambdaError(
				`Failed to invoke function '${functionName}' from service '${serviceCode}': Missing namespace and method on event`,
				LambdaError.codes.NO_ENDPOINT_PARAMS
			);
		}
	}

	/**
	 * @private
	 * @static
	 * @param {string} serviceCode JANIS service code
	 * @returns {Promise<string>} The service Account ID
	 */
	static async getServiceAccountId(serviceCode) {

		if(isLocalEnv())
			return;

		await SecretFetcher.fetch();

		const { [serviceCode]: serviceAccountId } = SecretFetcher.secretValue;

		if(!serviceAccountId)
			throw new LambdaError(`Service account ID not found for service code ${serviceCode}`, LambdaError.codes.NO_SERVICE_ACCOUNT_ID);

		return serviceAccountId;
	}

	static async getServiceLambdaInstance(serviceAccountId, serviceCode) {

		if(!isLocalEnv())
			return LambdaInstance.getInstanceWithRole(serviceAccountId);

		const servicePort = await getLocalServicePort(serviceCode);

		if(!servicePort)
			throw new LambdaError(`No local service port found for service code ${serviceCode}`, LambdaError.codes.NO_LOCAL_SERVICE_PORT);

		return LambdaInstance.getInstanceForLocalService(servicePort, serviceCode);

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
	static getInvokeServiceParams(functionName, serviceAccountId, serviceCode) {

		return {
			FunctionName: getLambdaFunctionName(functionName, serviceAccountId, serviceCode),
			InvocationType: 'RequestResponse'
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

			if(!body || !isObjectNotEmpty(body))
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

	/**
	 * @private
	 * @static
	 */
	static formatInvokeResponse({ StatusCode, FunctionError, Payload }) {

		let payload;

		try {

			payload = JSON.parse(Payload);

		} catch(err) {
			payload = Payload || {};
		}

		return {
			statusCode: StatusCode,
			...FunctionError && { functionError: FunctionError },
			payload
		};
	}
};
