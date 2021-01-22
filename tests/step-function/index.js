'use strict';

const assert = require('assert');
const sinon = require('sinon');
const StepFunctions = require('../../lib/step-function');
const StepFunctionsWrapper = require('../../lib/step-function/wrapper');

describe('StepFunctions tests', () => {

	const response = {
		executionArn: 'arn:aws:states:us-east-111:1:execution:service-test:1212121',
		startDate: '2020-07-17T03:05:54.561Z'
	};

	beforeEach(() => {
		this.StepFunctionsWrapper = sinon.stub(StepFunctionsWrapper, 'startExecution');
	});

	afterEach(() => {
		sinon.restore();
	});

	const listExecutions = 	{
		executions: [
			{
				executionArn: 'string',
				name: 'string',
				startDate: 1,
				stateMachineArn: 'string',
				status: 'string',
				stopDate: 1
			}
		],
		nextToken: 'string'
	};

	context('Start Executions', () => {

		it('Should throw an error when the arn is empty or invalid', async () => {

			await assert.rejects(StepFunctions.startExecution(), {
				name: 'StepFunctionsError',
				code: 1,
				message: 'Arn cannot be empty and must be an string.'
			});

			await assert.rejects(StepFunctions.startExecution(''), {
				name: 'StepFunctionsError',
				code: 1,
				message: 'Arn cannot be empty and must be an string.'
			});

			await assert.rejects(StepFunctions.startExecution({}), {
				name: 'StepFunctionsError',
				code: 1,
				message: 'Arn cannot be empty and must be an string.'
			});
		});

		it('Should throw an error when the name is empty string', async () => {

			await assert.rejects(StepFunctions.startExecution('arn', ' '), {
				name: 'StepFunctionsError',
				code: 2,
				message: 'Name cannot be empty and must be an string.'
			});
		});

		it('Should throw an error when the name is invalid', async () => {

			await assert.rejects(StepFunctions.startExecution('arn', []), {
				name: 'StepFunctionsError',
				code: 2,
				message: 'Name cannot be empty and must be an string.'
			});
		});

		it('Should throw an error when the client is empty string', async () => {

			await assert.rejects(StepFunctions.startExecution('arn', null, ' '), {
				name: 'StepFunctionsError',
				code: 3,
				message: 'Client cannot be empty and must be an string.'
			});
		});

		it('Should throw an error when the client is invalid', async () => {

			await assert.rejects(StepFunctions.startExecution('arn', null, []), {
				name: 'StepFunctionsError',
				code: 3,
				message: 'Client cannot be empty and must be an string.'
			});
		});

		it('Should throw an error when the data is invalid', async () => {

			await assert.rejects(StepFunctions.startExecution('arn', 'name', null, []), {
				name: 'StepFunctionsError',
				code: 4,
				message: 'Data must be an object.'
			});
		});

		it('Should throw an error when cannot start execution the state machine', async () => {

			const err = new Error('aws has technical difficulties, please stand by');
			this.StepFunctionsWrapper.returns({ promise: () => Promise.reject(err) });

			await assert.rejects(StepFunctions.startExecution('arn'), {
				name: 'Error'
			});
		});

		it('Should return data response', async () => {

			this.StepFunctionsWrapper.returns({ promise: () => Promise.resolve(response) });

			const result = await StepFunctions.startExecution('arn', null, null, null);
			assert.deepEqual(result, response);
		});

		it('Should return data response when recive a client', async () => {

			this.StepFunctionsWrapper.returns({ promise: () => Promise.resolve(response) });

			const result = await StepFunctions.startExecution('arn', null, 'default-client', null);
			assert.deepEqual(result, response);
		});

		it('Should return data response when recive a client and body', async () => {

			this.StepFunctionsWrapper.returns({ promise: () => Promise.resolve(response) });

			const result = await StepFunctions.startExecution('arn', null, 'default-client', { id: 123 });
			assert.deepEqual(result, response);
		});

		it('Should return data response when recive a data', async () => {

			this.StepFunctionsWrapper.returns({ promise: () => Promise.resolve(response) });

			const result = await StepFunctions.startExecution('arn', null, null, { shipping: '1sdsf4' });
			assert.deepEqual(result, response);
		});

		it('Should return data response when recive only a name', async () => {

			this.StepFunctionsWrapper.returns({ promise: () => Promise.resolve(response) });

			const result = await StepFunctions.startExecution('arn', 'name');
			assert.deepEqual(result, response);
		});
	});

	context('List Executions', () => {

		it('Should return the executions empty list test', async () => {

			this.StepFunctionsWrapper = sinon.stub(StepFunctionsWrapper, 'listExecutions');
			this.StepFunctionsWrapper.returns({ promise: () => Promise.resolve({ executions: [] }) });

			const result = await StepFunctions.listExecutions('arn', 'RUNNING');
			assert.deepEqual(result, { executions: [] });
		});

		it('Should return the executions list test', async () => {

			this.StepFunctionsWrapper = sinon.stub(StepFunctionsWrapper, 'listExecutions');
			this.StepFunctionsWrapper.returns({ promise: () => Promise.resolve(listExecutions) });

			const result = await StepFunctions.listExecutions('arn', 'RUNNING');
			assert.deepEqual(result, listExecutions);
		});

		it('Should return the executions list test whit extra params', async () => {

			this.StepFunctionsWrapper = sinon.stub(StepFunctionsWrapper, 'listExecutions');
			this.StepFunctionsWrapper.returns({ promise: () => Promise.resolve(listExecutions) });

			const result = await StepFunctions.listExecutions('arn', 'RUNNING', { maxResults: 10 });
			assert.deepEqual(result, listExecutions);
		});
	});
});
