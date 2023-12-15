'use strict';

const sinon = require('sinon');
const assert = require('assert');
const { mockClient } = require('aws-sdk-client-mock');
const { StartExecutionCommand, StopExecutionCommand, ListExecutionsCommand } = require('@aws-sdk/client-sfn');

const { Lambda } = require('../../lib');
const StepFunctions = require('../../lib/step-function');
const StepFunctionsWrapper = require('../../lib/step-function/wrapper');

describe('StepFunctions tests', () => {

	const startResponse = {
		executionArn: 'arn:aws:states:us-east-111:1:execution:service-test:1212121',
		startDate: '2020-07-17T03:05:54.561Z'
	};

	const stopResponse = {
		stopDate: new Date()
	};

	const listExecutions = {
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

	beforeEach(() => {
		this.sfnClientMock = mockClient(StepFunctionsWrapper.SFNClient);
		this.sfnClientMock.on(StartExecutionCommand).resolves(startResponse);
		this.sfnClientMock.on(StopExecutionCommand).resolves(stopResponse);
		this.sfnClientMock.on(ListExecutionsCommand).resolves(listExecutions);
	});

	afterEach(() => this.sfnClientMock.reset());

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

			this.sfnClientMock.on(StartExecutionCommand).resolves(err);

			const response = await StepFunctions.startExecution('arn');

			assert.rejects(response, {
				name: 'Error'
			});
		});

		it('Should return data response', async () => {

			const result = await StepFunctions.startExecution('arn', null, null, null);

			assert.deepEqual(result, startResponse);
		});

		it('Should return data and always send input with session and body', async () => {

			const result = await StepFunctions.startExecution('arn', null, null, null);

			this.sfnClientMock.commandCalls(StartExecutionCommand, {
				stateMachineArn: 'arn',
				input: '{"session":null,"body":null}'
			});

			assert.deepEqual(result, startResponse);
		});

		it('Should return data response with a extensive payload', async () => {

			const body = {

				name: 'Some-Name',
				age: 30,
				numbers: []
			};

			for(let index = 100000; index < 130000; index++)
				body.numbers.push(String(index));

			sinon.stub(Lambda, 'bodyToS3Path').resolves({
				contentS3Path: 'step-function-payloads/2022/12/23/addasdsadas.json'
			});

			const result = await StepFunctions.startExecution('arn', null, null, body);

			sinon.assert.calledOnceWithExactly(Lambda.bodyToS3Path, 'step-function-payloads', body, []);
			assert.deepEqual(result, startResponse);
		});

		it('Should return data response when receive a client', async () => {

			const result = await StepFunctions.startExecution('arn', null, 'default-client', null);

			assert.deepEqual(result, startResponse);
		});

		it('Should return data response when receive a client and body', async () => {

			const result = await StepFunctions.startExecution('arn', null, 'default-client', { id: 123 });

			assert.deepEqual(result, startResponse);
		});

		it('Should return data response when receive a data', async () => {

			const result = await StepFunctions.startExecution('arn', null, null, { shipping: '1sdsf4' });

			assert.deepEqual(result, startResponse);
		});

		it('Should return data response when receive only a name', async () => {

			const result = await StepFunctions.startExecution('arn', 'name');

			assert.deepEqual(result, startResponse);


		});
	});

	context('Stop Executions', () => {

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

			const result = await StepFunctions.stopExecution('executionArn');

			assert.deepEqual(result, stopResponse);
		});
	});

	context('List Executions', () => {

		it('Should return the executions empty list test', async () => {

			const response = { executions: [] };

			this.sfnClientMock.on(ListExecutionsCommand).resolves(response);

			const result = await StepFunctions.listExecutions('arn');

			assert.deepEqual(result, response);

			this.sfnClientMock.commandCalls(ListExecutionsCommand, {
				stateMachineArn: 'arn'
			});

		});

		it('Should return the executions list test', async () => {

			const result = await StepFunctions.listExecutions('arn');

			assert.deepEqual(result, listExecutions);
		});

		it('Should return the executions list test whit extra params', async () => {

			const result = await StepFunctions.listExecutions('arn', { maxResults: 10 });

			assert.deepEqual(result, listExecutions);

			this.sfnClientMock.commandCalls(ListExecutionsCommand, {
				stateMachineArn: 'arn',
				maxResults: 10
			});
		});
	});
});
