/* eslint-disable max-classes-per-file */

'use strict';

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');

const { captureAWSv3Client } = require('aws-xray-sdk-core');

class LambdaWrapper {

	constructor(config = {}) {

		/** @private */
		this._lambda = captureAWSv3Client(new LambdaClient(config));
	}

	/* istanbul ignore next */
	// AWS generates the Lambda class on the fly, the invoke method do not exists before creating the instance
	/**
	 * @param {Lambda.InvocationRequest} params
	 * @returns {Promise<import('aws-sdk/clients/lambda').InvocationResponse}
	 */
	async invoke(params) {
		const { Payload, ...response } = await this._lambda.send(new InvokeCommand(params));
		return {
			...response,
			Payload: Buffer.from(Payload).toString()
		};
	}
}

class StsWrapper {

	constructor(config) {

		/** @private */
		this._sts = captureAWSv3Client(new STSClient(config));
	}

	/* istanbul ignore next */
	// AWS generates the STS class on the fly, the assumeRole method do not exists before creating the instance
	/**
	 * @param {STS.AssumeRoleRequest} params
	 * @returns {Promise<import('aws-sdk/clients/sts').AssumeRoleResponse>}
	 */
	assumeRole(params) {
		return this._sts.send(new AssumeRoleCommand(params));
	}
}

module.exports = { LambdaWrapper, StsWrapper };
