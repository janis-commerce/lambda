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
	 */
	constructor(LambdaFunction, session, data) {

		this.validateLambdaFunction(LambdaFunction);

		/** @type Lambda */
		this.lambdaFunction = new LambdaFunction();

		this.validateRequest(session, data);

		this.session = session;
		this.data = data;
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
	validateRequest(session, data) {

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
	}

	/**
	 * Prepare the Lambda Function
	 * @private
	 */
	prepare() {
		this.setSession(this.session);
		this.setData(this.data);
	}

	setSession(session) {
		this.lambdaFunction.session = session ? new ApiSession(session) : new ApiSession();
	}

	setData(data) {
		this.lambdaFunction.data = this.lambdaFunction.struct ? this.lambdaFunction.struct(data) : data;
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
