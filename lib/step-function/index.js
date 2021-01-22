'use strict';

const StepFunctions = require('./wrapper');
const StepFunctionsError = require('./error');

module.exports = class StepFunction {

	/**
	 * Get the params
	 *
	 * @static
	 *
	 * @param {string} arn The amazon resource name (ARN) of the state machine to execute
	 * @param {string} name The name of the execution
	 * @param {string} clientCode The client code
	 * @param {Mixed} [data] input data
	 * @return {Object} The parameters.
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

		const inputData = { ...clientCode && { session: { clientCode } }, ...data && { body: data } };

		return {
			stateMachineArn: arn,
			...name && { name },
			...Object.keys(inputData).length && { input: JSON.stringify(inputData) }
		};
	}

	/**
	 * Starts a state machine execution
	 *
	 * @static
	 * @param {Object} param object param
	 * @param {string} param.arn the amazon resource name (ARN) of the state machine to execute
	 * @param {string} [param.name] the name of the execution
	 * @param {string} [client] client code
	 * @param {Mixed} [data] input data
	 * @returns
	 */

	/**
	 * Starts a state machine execution
	 *
	 * [AWS SDK - StepFunctions.startExecution]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#startExecution-property}
	 *
	 * @static
	 *
	 * @param {string} arn The amazon resource name (ARN) of the state machine to execute
	 * @param {string} name The name of the execution
	 * @param {string} clientCode The client code
	 * @param {Mixed} [data] input data
	 * @return {Promise}
	 */
	static async startExecution(arn, name, clientCode, data) {
		const params = this.getParams(arn, name, clientCode, data);
		return StepFunctions.startExecution(params).promise();
	}

	/**
	 * List the state machine executions
	 *
	 * [AWS SDK - StepFunctions.listExecutions]{@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#listExecutions-property}
	 *
	 * @static
	 *
	 *	@typedef {Object} StateMachineExecution
	 * @param {string} arn The arn
	 * @param {object} params The extra parameters to filter
	 * @return {Promise<StateMachineExecution>} The state machine executions
	 */
	static async listExecutions(arn, params) {
		const stateMachineArn = this.getParams(arn);
		return StepFunctions.listExecutions({
			...stateMachineArn,
			...params
		}).promise();
	}
};
