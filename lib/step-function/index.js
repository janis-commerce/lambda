'use strict';

const StepFunctions = require('./wrapper');
const StepFunctionsError = require('./error');

/** @typedef {import('aws-sdk/clients/stepfunctions').Arn} ARN */

/** @typedef {"RUNNING"|"SUCCEEDED"|"FAILED"|"TIMED_OUT"|"ABORTED"} ExecutionStatus */

/**
 * @typedef StopExecutionParams
 * @property {string} [cause] The cause that stopped the execution
 * @property {string} [error] The error code
 */

/**
 * @typedef ListExecutionsParams
 * @property {ExecutionStatus} [statusFilter]
 * @property {number} [maxResults]
 * @property {string} [nextToken]
 */

module.exports = class StepFunction {

	/**
	 * Get the params
	 *
	 * @static
	 * @private
	 *
	 * @param {ARN} arn The Amazon Resource Name (ARN) of the state machine to execute
	 * @param {string} [name] The name of the execution
	 * @param {string} [clientCode] The client code
	 * @param {*} [data] input data
	 * @return {object} The parameters.
	 */
	static getParams(arn, name, clientCode, data) {

		if(!arn || typeof arn !== 'string' || !arn.length)
			throw new StepFunctionsError('Arn cannot be empty and must be an string.', StepFunctionsError.codes.INVALID_ARN);

		if((typeof name === 'string' && !name.trim().length) || (name && typeof name !== 'string'))
			throw new StepFunctionsError('Name cannot be empty and must be an string.', StepFunctionsError.codes.INVALID_NAME);

		if((typeof clientCode === 'string' && !clientCode.trim().length) || (clientCode && typeof clientCode !== 'string'))
			throw new StepFunctionsError('Client cannot be empty and must be an string.', StepFunctionsError.codes.INVALID_CLIENT);

		if((data && typeof data !== 'object') || Array.isArray(data))
			throw new StepFunctionsError('Data must be an object.', StepFunctionsError.codes.INVALID_DATA);

		const inputData = {
			...(clientCode && { session: { clientCode } }),
			...(data && { body: data })
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
	 * @param {*} [data] input data
	 */
	static async startExecution(arn, name, clientCode, data) {
		const params = this.getParams(arn, name, clientCode, data);
		return StepFunctions.startExecution(params).promise();
	}

	/**
	 * Stops an state machine execution.
	 *
	 * [AWS SDK - StepFunctions.startExecution]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#stopExecution-property}
	 *
	 * @static
	 * @param {ARN} executionArn The execution ARN
	 * @param {StopExecutionParams} params The parameters
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
	 * @param {ListExecutionsParams} params The extra parameters to filter
	 */
	static async listExecutions(arn, params) {
		const stateMachineArn = this.getParams(arn);
		return StepFunctions.listExecutions({
			...stateMachineArn,
			...params
		}).promise();
	}
};
