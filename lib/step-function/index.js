'use strict';

const StepFunctions = require('./wrapper');
const StepFunctionsError = require('./error');

const Lambda = require('../lambda-bases/lambda');

const BYTE_DATA_LIMIT = 256000; // The real limit is 262144 bytes, but we use 256000 bytes to obtain a margin of bytes.

/** @typedef {import('aws-sdk/clients/stepfunctions').Arn} ARN */

/** @typedef {"RUNNING"|"SUCCEEDED"|"FAILED"|"TIMED_OUT"|"ABORTED"} ExecutionStatus */

module.exports = class StepFunction {

	/**
	 * Get the params
	 *
	 * @private
	 * @static
	 * @param {ARN} arn The Amazon Resource Name (ARN) of the state machine to execute
	 * @param {string} [name] The name of the execution
	 * @param {string} [clientCode] The client code
	 * @param {*} [data] input data
	 * @param {Array<string>} payloadFixedProperties the fields that should not be eliminated in the data
	 * @return {object} The parameters.
	 */
	static async getParams(arn, name, clientCode, data, payloadFixedProperties = []) {

		if(!arn || typeof arn !== 'string' || !arn.length)
			throw new StepFunctionsError('Arn cannot be empty and must be an string.', StepFunctionsError.codes.INVALID_ARN);

		if((typeof name === 'string' && !name.trim().length) || (name && typeof name !== 'string'))
			throw new StepFunctionsError('Name cannot be empty and must be an string.', StepFunctionsError.codes.INVALID_NAME);

		if((typeof clientCode === 'string' && !clientCode.trim().length) || (clientCode && typeof clientCode !== 'string'))
			throw new StepFunctionsError('Client cannot be empty and must be an string.', StepFunctionsError.codes.INVALID_CLIENT);

		if((data && typeof data !== 'object') || Array.isArray(data))
			throw new StepFunctionsError('Data must be an object.', StepFunctionsError.codes.INVALID_DATA);

		const body = data && this.dataExceedsLimit(data)
			? await Lambda.bodyToS3Path('step-function-payloads', data, payloadFixedProperties)
			: data;

		const inputData = {
			session: clientCode ? { clientCode } : null,
			body: body || null
		};

		return {
			stateMachineArn: arn,
			...(name && { name }),
			...(Object.keys(inputData).length && { input: JSON.stringify(inputData) })
		};
	}

	/**
	 * Starts a state machine execution
	 *
	 * [AWS SDK - StepFunctions.startExecution]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#startExecution-property}
	 *
	 * @static
	 *
	 * @param {ARN} arn The amazon resource name (ARN) of the state machine to execute
	 * @param {string} name The name of the execution
	 * @param {string} clientCode The client code
	 * @param {import('aws-sdk/clients/stepfunctions').StartExecutionInput} [data] input data
	 * @param {Array<string>} payloadFixedProperties the fields that should not be eliminated in the data
	 * @returns {Promise<import('aws-sdk/clients/stepfunctions').StartExecutionOutput>}
	 */
	static async startExecution(arn, name, clientCode, data, payloadFixedProperties) {
		const params = await this.getParams(arn, name, clientCode, data, payloadFixedProperties);
		return StepFunctions.startExecution(params).promise();
	}

	/**
	 * Stops an state machine execution.
	 *
	 * [AWS SDK - StepFunctions.startExecution]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#stopExecution-property}
	 *
	 * @static
	 * @param {ARN} executionArn The execution ARN
	 * @param {import('aws-sdk/clients/stepfunctions').StopExecutionInput} params The parameters
	 * @returns {Promise<import('aws-sdk/clients/stepfunctions').StopExecutionOutput>}
	 */
	static async stopExecution(executionArn, params) {

		if(!executionArn || typeof executionArn !== 'string' || !executionArn.length)
			throw new StepFunctionsError('Arn cannot be empty and must be an string.', StepFunctionsError.codes.INVALID_ARN);

		return StepFunctions.stopExecution({
			executionArn,
			...params
		}).promise();
	}

	/**
	 * List the state machine executions
	 *
	 * [AWS SDK - StepFunctions.listExecutions]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#listExecutions-property}
	 *
	 * @static
	 *
	 * @param {ARN} arn The ARN
	 * @param {import('aws-sdk/clients/stepfunctions').ListExecutionsInput} params The extra parameters to filter
	 * @returns {Promise<import('aws-sdk/clients/stepfunctions').ListExecutionsOutput>}
	 */
	static async listExecutions(arn, params) {
		const stateMachineArn = await this.getParams(arn);
		return StepFunctions.listExecutions({
			...stateMachineArn,
			...params
		}).promise();
	}

	/**
	 * Check if the data exceeds the limit
	 *
	 * @param {*} [data] input data
	 * {@link https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html#API_StartExecution_RequestSyntax AWS/LimitReference}
	 *
	 * @returns {Boolean} If the data exceeds the limit
	 */
	static dataExceedsLimit(data) {
		return Buffer.byteLength(JSON.stringify(data)) >= BYTE_DATA_LIMIT;
	}
};
