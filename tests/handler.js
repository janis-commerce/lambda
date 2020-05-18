'use strict';

const assert = require('assert');
const { ApiSession } = require('@janiscommerce/api-session');

require('lllog')('none');

const { Handler, LambdaError } = require('../lib/index');

describe('Handler', () => {

	const makeLambdaClass = (
		mustHaveClient = false,
		mustHavePayload = false,
		struct = data => data,
		validate = () => null
	) => {
		return class LambdaFunctionExample {
			get mustHaveClient() {
				return mustHaveClient;
			}

			get mustHavePayload() {
				return mustHavePayload;
			}

			get struct() {
				return struct;
			}

			async validate() {
				if(validate)
					return validate();
			}

			process() {}
		};
	};

	let oldEnv;

	before(() => {
		oldEnv = process.env;
	});

	after(() => {
		process.env = oldEnv;
	});

	context('When Invalid Args is passed and default handling Validate Errors', () => {

		it('Should return an error message if no Lambda Function is passed', async () => {
			assert.deepStrictEqual(await Handler.handle(), { errorType: 'LambdaError', errorMessage: 'No Lambda Function is found' });
		});

		it('Should return an error message if no Lambda Function is not a Class', async () => {

			assert.deepStrictEqual(await Handler.handle(1), { errorType: 'LambdaError', errorMessage: 'Invalid Lambda Function' });
			assert.deepStrictEqual(await Handler.handle('Lambda'), { errorType: 'LambdaError', errorMessage: 'Invalid Lambda Function' });
			assert.deepStrictEqual(await Handler.handle(true), { errorType: 'LambdaError', errorMessage: 'Invalid Lambda Function' });
			assert.deepStrictEqual(await Handler.handle(() => true), { errorType: 'LambdaError', errorMessage: 'Invalid Lambda Function' });
			assert.deepStrictEqual(await Handler.handle({}), { errorType: 'LambdaError', errorMessage: 'Invalid Lambda Function' });
			assert.deepStrictEqual(await Handler.handle([]), { errorType: 'LambdaError', errorMessage: 'Invalid Lambda Function' });
		});

		it('Should return an error message if no invalid Client Code is passed', async () => {

			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(), { __clientCode: 1 }),
				{ errorType: 'LambdaError', errorMessage: 'Invalid Client, must be a String' });

			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(), { __clientCode: {} }),
				{ errorType: 'LambdaError', errorMessage: 'Invalid Client, must be a String' });

			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(), { __clientCode: [] }),
				{ errorType: 'LambdaError', errorMessage: 'Invalid Client, must be a String' });

			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(), { __clientCode: true }),
				{ errorType: 'LambdaError', errorMessage: 'Invalid Client, must be a String' });
		});

		it('Should return an error message if Client is not passed when Lambda Function must have one', async () => {
			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(true)),
				{ errorType: 'LambdaError', errorMessage: 'Lambda Function must have Client' });
		});

		it('Should return an error message if Payload is not passed when Lambda Function must have one', async () => {
			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(true, true), { __clientCode: 'defaultClient' }),
				{ errorType: 'LambdaError', errorMessage: 'Lambda Function must have Payload' });
		});

		it('Should return an error message if Lambda Function\'s struct failed', async () => {

			const LambdaClass = makeLambdaClass(true, true, () => { throw new Error('Invalid Struct'); });

			assert.deepStrictEqual(await Handler.handle(LambdaClass, { __clientCode: 'defaultClient', body: 'invalid' }),
				{ errorType: 'Error', errorMessage: 'Invalid Struct' });
		});

		it('Should return an error message if Lambda Function\'s validate failed', async () => {

			const LambdaClass = makeLambdaClass(true, true, data => data, () => { throw new Error('Invalid Validate'); });

			assert.deepStrictEqual(await Handler.handle(LambdaClass, { __clientCode: 'defaultClient', body: 'valid' }),
				{ errorType: 'Error', errorMessage: 'Invalid Validate' });
		});
	});

	context('When Invalid Args is passed and custom handling Validate Errors', () => {

		class CustomHanlder extends Handler {

			static handleValidationError(error) {
				throw error;
			}
		}

		it('Should return an error message if no Lambda Function is passed', async () => {
			await assert.rejects(CustomHanlder.handle(), { name: 'LambdaError', code: LambdaError.codes.NO_LAMBDA });
		});

		it('Should return an error message if no Lambda Function is not a Class', async () => {

			await assert.rejects(CustomHanlder.handle(1), { name: 'LambdaError', code: LambdaError.codes.INVALID_LAMBDA });
			await assert.rejects(CustomHanlder.handle('Lambda'), { name: 'LambdaError', code: LambdaError.codes.INVALID_LAMBDA });
			await assert.rejects(CustomHanlder.handle(true), { name: 'LambdaError', code: LambdaError.codes.INVALID_LAMBDA });
			await assert.rejects(CustomHanlder.handle(() => true), { name: 'LambdaError', code: LambdaError.codes.INVALID_LAMBDA });
			await assert.rejects(CustomHanlder.handle({}), { name: 'LambdaError', code: LambdaError.codes.INVALID_LAMBDA });
			await assert.rejects(CustomHanlder.handle([]), { name: 'LambdaError', code: LambdaError.codes.INVALID_LAMBDA });
		});

		it('Should return an error message if no invalid Client Code is passed', async () => {

			await assert.rejects(CustomHanlder.handle(makeLambdaClass(), { __clientCode: 1 }),
				{ name: 'LambdaError', code: LambdaError.codes.INVALID_CLIENT });

			await assert.rejects(CustomHanlder.handle(makeLambdaClass(), { __clientCode: {} }),
				{ name: 'LambdaError', code: LambdaError.codes.INVALID_CLIENT });

			await assert.rejects(CustomHanlder.handle(makeLambdaClass(), { __clientCode: [] }),
				{ name: 'LambdaError', code: LambdaError.codes.INVALID_CLIENT });

			await assert.rejects(CustomHanlder.handle(makeLambdaClass(), { __clientCode: true }),
				{ name: 'LambdaError', code: LambdaError.codes.INVALID_CLIENT });
		});

		it('Should return an error message if Client is not passed when Lambda Function must have one', async () => {
			await assert.rejects(CustomHanlder.handle(makeLambdaClass(true)),
				{ name: 'LambdaError', code: LambdaError.codes.NO_CLIENT });
		});

		it('Should return an error message if Payload is not passed when Lambda Function must have one', async () => {
			await assert.rejects(CustomHanlder.handle(makeLambdaClass(true, true), { __clientCode: 'defaultClient' }),
				{ name: 'LambdaError', code: LambdaError.codes.NO_PAYLOAD });
		});

		it('Should return an error message if Lambda Function\'s struct failed', async () => {

			const LambdaClass = makeLambdaClass(true, true, () => { throw new Error('Invalid Struct'); });

			await assert.rejects(CustomHanlder.handle(LambdaClass, { __clientCode: 'defaultClient', body: 'invalid' }),
				{ name: 'Error', message: 'Invalid Struct' });
		});

		it('Should return an error message if Lambda Function\'s validate failed', async () => {

			const LambdaClass = makeLambdaClass(true, true, data => data, () => { throw new Error('Invalid Validate'); });

			await assert.rejects(CustomHanlder.handle(LambdaClass, { __clientCode: 'defaultClient', body: 'valid' }),
				{ name: 'Error', message: 'Invalid Validate' });
		});
	});

	context('When valid Args is passed', () => {

		beforeEach(() => {
			process.env.JANIS_SERVICE_NAME = 'test';
			process.env.JANIS_ENV = 'test';
			process.env.AWS_LAMBDA_FUNCTION_NAME = 'TestLambdaFunction';
		});

		it('Should set correct session and data', async () => {

			const clientCode = 'defaultClient';
			const body = {
				name: 'Some-Name',
				age: 30,
				pets: ['Cats', 'Birds']
			};

			const session = new ApiSession({ clientCode });
			class LambdaFunctionExample {

				process() {
					return {
						session: this.session,
						data: this.data
					};
				}
			}

			assert.deepStrictEqual(await Handler.handle(LambdaFunctionExample, { __clientCode: clientCode, body }), { session, data: body });
		});

		it('Should set PAYLOAD ENV VAR if body is passed', async () => {

			const body = {
				name: 'Some-Name',
				age: 30,
				pets: ['Cats', 'Birds']
			};

			await Handler.handle(makeLambdaClass(), { body });

			assert.strictEqual(process.env.JANIS_LAMBDA_PAYLOAD, JSON.stringify({ body }));
		});

		it('Should set PAYLOAD ENV VAR if clientCode is passed', async () => {

			const clientCode = 'defaultClient';

			await Handler.handle(makeLambdaClass(), { __clientCode: clientCode });

			assert.strictEqual(process.env.JANIS_LAMBDA_PAYLOAD, JSON.stringify({ __clientCode: clientCode }));
		});

		it('Should not set PAYLOAD ENV VAR if payload is not passed', async () => {

			await Handler.handle(makeLambdaClass());

			assert.strictEqual(process.env.JANIS_LAMBDA_PAYLOAD, undefined);
		});

		it('Should not change AWS_LAMBDA_FUNCTION_NAME ENV VAR if Env is not local', async () => {

			await Handler.handle(makeLambdaClass());

			assert.strictEqual(process.env.AWS_LAMBDA_FUNCTION_NAME, 'TestLambdaFunction');
		});

		it('Should not change AWS_LAMBDA_FUNCTION_NAME ENV VAR if Env is not local', async () => {

			delete process.env.AWS_LAMBDA_FUNCTION_NAME; // In local it doesn't exist
			process.env.JANIS_ENV = 'local';

			await Handler.handle(makeLambdaClass());

			assert.strictEqual(process.env.AWS_LAMBDA_FUNCTION_NAME, 'JanisTestService-local-LambdaFunctionExample');
		});

		it('Should failed if no JANIS_SERVICE_NAME, AWS_LAMBDA_FUNCTION_NAME ENV VAR are setted and Env is local ', async () => {

			delete process.env.AWS_LAMBDA_FUNCTION_NAME; // In local it doesn't exist
			delete process.env.JANIS_SERVICE_NAME;
			process.env.JANIS_ENV = 'local';

			await assert.rejects(Handler.handle(makeLambdaClass()), { name: 'LambdaError', code: LambdaError.codes.NO_SERVICE });
		});

		it('Should return undefined if no process is found', async () => {

			class LambdaFunctionExample {
			}

			assert.deepStrictEqual(await Handler.handle(LambdaFunctionExample), undefined);
		});

		it('Should return undefined if process do not return values', async () => {

			assert.deepStrictEqual(await Handler.handle(makeLambdaClass()), undefined);
		});

		it('Should reject if process rejects', async () => {

			class LambdaFunctionExample {

				process() {
					throw new Error('Process Failed');
				}
			}

			await assert.rejects(Handler.handle(LambdaFunctionExample), { name: 'Error', message: 'Process Failed' });
		});
	});
});
