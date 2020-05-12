'use strict';

const { ApiSession } = require('@janiscommerce/api-session');

const LambdaError = require('./lambda-error');

module.exports = class Dispatcher {

	constructor(LambdaFunction, clientCode, data) {

		this.validateLambdaFunction(LambdaFunction);

		this.lambdaFunction = new LambdaFunction();

		this.validateRequest(clientCode, data);

		this.clientCode = clientCode;
		this.data = data;
	}

	validateLambdaFunction(LambdaFunction) {

		if(!LambdaFunction)
			throw new LambdaError('No Lambda Function is found', LambdaError.codes.NO_LAMBDA);

		if(!this.isClass(LambdaFunction))
			throw new LambdaError('Invalid Lambda Function', LambdaError.codes.INVALID_LAMBDA);
	}

	isClass(TheClass) {
		return /^\s*class/.test(TheClass.toString());
	}

	validateRequest(clientCode, data) {

		if(this.lambdaFunction.mustHaveClient && !clientCode)
			throw new LambdaError('Lambda Function must have Client', LambdaError.codes.NO_CLIENT);

		if(clientCode && typeof clientCode !== 'string')
			throw new LambdaError('Invalid Client, must be a String', LambdaError.codes.INVALID_CLIENT);

		if(this.lambdaFunction.mustHavePayload && !data)
			throw new LambdaError('Lambda Function must have Payload', LambdaError.codes.NO_PAYLOAD);
	}

	/**
     * Prepare the Lambda Function
     */
	prepare() {
		this.setSession(this.clientCode);
		this.setData(this.data);
	}

	setSession(clientCode) {
		this.lambdaFunction.session = clientCode ? new ApiSession({ clientCode }) : new ApiSession();
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
