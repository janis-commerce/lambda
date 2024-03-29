'use strict';

const { ApiSession } = require('@janiscommerce/api-session');

const LambdaError = require('../lambda-error');

/**
 * @typedef {import('../lambda-bases/lambda')} Lambda
 */

module.exports = class Dispatcher {

	/**
	 * @param {Lambda} LambdaFunction
	 * @param {ApiSession} session
	 * @param {*} data
	 * @param {string?} taskToken The task async token in case a function is invoked as an async task of a state machine
	 * @param {object?} state The task state. Only present for tasks invoked from state machines.
	 */
	constructor(LambdaFunction, session, data, taskToken, state) {

		this.validateLambdaFunction(LambdaFunction);

		/** @type Lambda */
		this.lambdaFunction = new LambdaFunction();

		this.validateRequest(session, data, taskToken, state);

		this.session = session;
		this.data = data;
		this.taskToken = taskToken;
		this.state = state;
	}

	/**
	 * Get fields that should not be eliminated from the result
	 */
	get payloadFixedProperties() {
		return this.lambdaFunction.payloadFixedProperties || [];
	}

	/**
	 * @private
	 */
	validateLambdaFunction(LambdaFunction) {

		if(!LambdaFunction)
			throw new LambdaError('No Lambda Function is found', LambdaError.codes.NO_LAMBDA);

		if(!this.isClass(LambdaFunction))
			throw new LambdaError('Invalid Lambda Function', LambdaError.codes.INVALID_LAMBDA);
	}

	/**
	 * @private
	 */
	isClass(TheClass) {
		return /^\s*class/.test(TheClass.toString());
	}

	/**
	 * @private
	 */
	validateRequest(session, data, taskToken, state) {

		if(session && (typeof session !== 'object' || Array.isArray(session)))
			throw new LambdaError('Invalid Session, must be an Object', LambdaError.codes.INVALID_SESSION);

		if(this.lambdaFunction.mustHaveClient && (!session || !session.clientCode))
			throw new LambdaError('Lambda Function must have Client', LambdaError.codes.NO_CLIENT);

		if(session && session.clientCode && typeof session.clientCode !== 'string')
			throw new LambdaError('Invalid Client, must be a String', LambdaError.codes.INVALID_CLIENT);

		if(this.lambdaFunction.mustHaveUser && (!session || !session.userId))
			throw new LambdaError('Lambda Function must have User', LambdaError.codes.NO_USER);

		if(session && session.userId && typeof session.userId !== 'string')
			throw new LambdaError('Invalid User ID, must be a String', LambdaError.codes.INVALID_USER);

		if(this.lambdaFunction.mustHavePayload && !data)
			throw new LambdaError('Lambda Function must have Payload', LambdaError.codes.NO_PAYLOAD);

		if(typeof taskToken !== 'undefined' && typeof taskToken !== 'string')
			throw new LambdaError('Task token must be a string if present', LambdaError.codes.INVALID_TASK_TOKEN);

		if(typeof state !== 'undefined' && typeof state !== 'object')
			throw new LambdaError('Invalid State, must be a object if present', LambdaError.codes.INVALID_STATE);
	}

	/**
	 * Prepare the Lambda Function
	 * @private
	 */
	prepare() {
		this.setSession(this.session);
		this.setData(this.data);
		this.setToken(this.taskToken);
		this.setState(this.state);
	}

	setSession(session) {
		this.lambdaFunction.session = session ? new ApiSession(session) : new ApiSession();
	}

	setData(data) {
		this.lambdaFunction.data = this.lambdaFunction.struct ? this.lambdaFunction.struct(data) : data;
	}

	setToken(taskToken) {
		this.lambdaFunction.taskToken = taskToken;
	}

	setState(state) {
		this.lambdaFunction.state = state;
	}

	/**
	 * Execute Lambda Function validate method
	 */
	validate() {
		return this.lambdaFunction.validate && this.lambdaFunction.validate();
	}

	/**
	 * Execute Lambda Function process method
	 */
	process() {
		return this.lambdaFunction.process && this.lambdaFunction.process();
	}
};
