'use strict';

const { Lambda } = require('aws-sdk');

module.exports = class LambdaWrapper {

	constructor() {

		const config = process.env.JANIS_ENV !== 'local' ? {} : { endpoint: `http://localhost:${process.env.MS_PORT}/api` };
		/** @private */
		this._lambda = new Lambda(config);
	}

	/* istanbul ignore next */
	// AWS generates the Lambda class on the fly, the invoke method do not exists before creating the instance
	/**
	 * @param {Lambda.InvocationRequest} params
	 * @returns {Promise<import('aws-sdk/clients/lambda').InvocationResponse}
	 */
	invoke(params) {
		return this._lambda.invoke(params).promise();
	}

};
