'use strict';

const assert = require('assert');
const sinon = require('sinon');
const { Lambda } = require('../../lib');
const StepFunctions = require('../../lib/step-function');
const StepFunctionsWrapper = require('../../lib/step-function/wrapper');

describe('StepFunctions tests', () => {

	beforeEach(() => {
		this.startExecutionStub = sinon.stub(StepFunctionsWrapper, 'startExecution');
		this.stopExecutionStub = sinon.stub(StepFunctionsWrapper, 'stopExecution');
	});

	afterEach(() => {
		sinon.restore();
	});

	context('Start Executions', () => {

		const response = {
			executionArn: 'arn:aws:states:us-east-111:1:execution:service-test:1212121',
			startDate: '2020-07-17T03:05:54.561Z'
		};

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
			this.startExecutionStub.returns(err);

			const startResponse = await StepFunctions.startExecution('arn');

			assert.rejects(startResponse, {
				name: 'Error'
			});
		});

		it('Should return data response', async () => {

			this.startExecutionStub.returns(response);

			const result = await StepFunctions.startExecution('arn', null, null, null);

			assert.deepEqual(result, response);
		});

		it('Should return data and always send input with session and body', async () => {

			this.startExecutionStub.returns(response);

			const result = await StepFunctions.startExecution('arn', null, null, null);

			this.startExecutionStub.calledOnceWithExactly({
				stateMachineArn: 'arn',
				input: '{"session":null,"body":null}'
			});

			assert.deepEqual(result, response);
		});

		it('Should return data response with a extensive payload', async () => {

			this.startExecutionStub.returns(response);

			const body = {
				name: 'Some-Name',
				age: 30,
				numbers: []
			};

			for(let index = 100000; index < 130000; index++)
				body.numbers.push(String(index));

			const contentS3Path = 'step-function-payloads/2022/12/23/addasdsadas.json';

			sinon.stub(Lambda, 'bodyToS3Path').resolves({
				contentS3Path
			});

			const result = await StepFunctions.startExecution('arn', null, null, body);

			sinon.assert.calledOnceWithExactly(Lambda.bodyToS3Path, 'step-function-payloads', body, []);
			assert.deepEqual(result, response);
		});

		it('Should return data response when recive a client', async () => {

			this.startExecutionStub.returns(response);

			const result = await StepFunctions.startExecution('arn', null, 'default-client', null);
			assert.deepEqual(result, response);
		});

		it('Should return data response when recive a client and body', async () => {

			this.startExecutionStub.returns(response);

			const result = await StepFunctions.startExecution('arn', null, 'default-client', { id: 123 });
			assert.deepEqual(result, response);
		});

		it('Should return data response when recive a data', async () => {

			this.startExecutionStub.returns(response);

			const result = await StepFunctions.startExecution('arn', null, null, { shipping: '1sdsf4' });
			assert.deepEqual(result, response);
		});

		it('Should return data response when recive only a name', async () => {

			this.startExecutionStub.returns(response);

			const result = await StepFunctions.startExecution('arn', 'name');
			assert.deepEqual(result, response);
		});
	});

	context('Stop Executions', () => {

		const stopResponse = {
			stopDate: new Date()
		};

		it('Should throw an error when the arn is empty or invalid', async () => {

			await assert.rejects(StepFunctions.stopExecution(), {
				name: 'StepFunctionsError',
				code: 1,
				message: 'Arn cannot be empty and must be an string.'
			});

			await assert.rejects(StepFunctions.stopExecution(''), {
				name: 'StepFunctionsError',
				code: 1,
				message: 'Arn cannot be empty and must be an string.'
			});

			await assert.rejects(StepFunctions.stopExecution({}), {
				name: 'StepFunctionsError',
				code: 1,
				message: 'Arn cannot be empty and must be an string.'
			});
		});

		it('Should return data response', async () => {

			this.stopExecutionStub.returns(stopResponse);

			const result = await StepFunctions.stopExecution('executionArn');
			assert.deepEqual(result, stopResponse);
		});
	});

	context('List Executions', () => {

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

		it('Should return the executions empty list test', async () => {

			sinon.stub(StepFunctionsWrapper, 'listExecutions').returns({ executions: [] });

			const result = await StepFunctions.listExecutions('arn');
			assert.deepEqual(result, { executions: [] });
			sinon.assert.calledOnceWithExactly(StepFunctionsWrapper.listExecutions, {
				stateMachineArn: 'arn'
			});
		});

		it('Should return the executions list test', async () => {

			sinon.stub(StepFunctionsWrapper, 'listExecutions').returns(listExecutions);

			const result = await StepFunctions.listExecutions('arn');
			assert.deepEqual(result, listExecutions);
		});

		it('Should return the executions list test whit extra params', async () => {

			sinon.stub(StepFunctionsWrapper, 'listExecutions').returns(listExecutions);

			const result = await StepFunctions.listExecutions('arn', { maxResults: 10 });
			assert.deepEqual(result, listExecutions);

			sinon.assert.calledOnceWithExactly(StepFunctionsWrapper.listExecutions, {
				stateMachineArn: 'arn',
				maxResults: 10
			});
		});
	});
});
