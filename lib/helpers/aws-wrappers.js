'use strict';

const { STS, Lambda } = require('aws-sdk');

class LambdaWrapper {

	constructor(config = {}) {

		config = {
			...config,
			...process.env.JANIS_ENV === 'local' && { endpoint: `http://localhost:${process.env.MS_PORT}/api` }
		};

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
}

class StsWrapper {

	constructor(config) {

		/** @private */
		this._sts = new STS(config);
	}

	/* istanbul ignore next */
	// AWS generates the STS class on the fly, the assumeRole method do not exists before creating the insance
	/**
	 * @param {STS.AssumeRoleRequest} params
	 * @returns {Promise<import('aws-sdk/clients/sts').AssumeRoleResponse>}
	 */
	assumeRole(params) {
		return this._sts.assumeRole(params).promise();
	}
}

module.exports = {
	Lambda: LambdaWrapper,
	STS: StsWrapper
};
