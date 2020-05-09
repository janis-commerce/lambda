'use strict';

const { ApiSession } = require('@janiscommerce/api-session');
const logger = require('lllog')();

module.exports = class Handler {

	static async handle(LambdaFunction, { __clientCode: clientCode, body: data }) {

		this.lambdaFunction = new LambdaFunction();

		try {

			await this.validateRequest(clientCode, data);

			this.setSession(clientCode);
			this.setData(data);

			await this.validateLambdaFunction();

		} catch(error) {
			return this.handleValidateError(error);
		}

		return this.processLambdaFunction();
	}

	static async validateRequest(clientCode, data) {

		if(this.lambdaFunction.mustHaveClient && !clientCode)
			throw new Error('Lambda Function must have Client');

		if(this.lambdaFunction.mustHavePayload && !data)
			throw new Error('Lambda Function must have Payload');
	}

	static setSession(clientCode) {
		this.lambdaFunction.session = clientCode ? new ApiSession({ clientCode }) : new ApiSession();
	}

	static setData(data) {
		this.lambdaFunction.data = this.lambdaFunction.struct ? this.lambdaFunction.struct(data) : data;
	}

	static validateLambdaFunction() {
		return this.lambdaFunction.validate && this.lambdaFunction.validate();
	}

	static handleValidateError(error) {

		logger.error(error);

		return {
			errorType: error.name,
			errorMessage: error.message
		};
	}

	static processLambdaFunction() {
		return this.lambdaFunction.process && this.lambdaFunction.process();
	}
};
