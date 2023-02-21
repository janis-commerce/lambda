'use strict';

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');

class LambdaWrapper {

	constructor(config = {}) {

		/** @private */
		this._lambda = new LambdaClient(config);
	}

	/* istanbul ignore next */
	// AWS generates the Lambda class on the fly, the invoke method do not exists before creating the instance
	/**
	 * @param {Lambda.InvocationRequest} params
	 * @returns {Promise<import('aws-sdk/clients/lambda').InvocationResponse}
	 */
	invoke(params) {
		const command = new InvokeCommand(params);
		return this._lambda.send(command);
	}
}

class StsWrapper {

	constructor(config) {

		/** @private */
		this._sts = new STSClient(config);
	}

	/* istanbul ignore next */
	// AWS generates the STS class on the fly, the assumeRole method do not exists before creating the instance
	/**
	 * @param {STS.AssumeRoleRequest} params
	 * @returns {Promise<import('aws-sdk/clients/sts').AssumeRoleResponse>}
	 */
	assumeRole(params) {
		const command = new AssumeRoleCommand(params);
		return this._sts.send(command);
	}
}

module.exports = { LambdaWrapper, StsWrapper };
