'use strict';

const assert = require('assert');
const sinon = require('sinon');
const { ApiSession } = require('@janiscommerce/api-session');

const Events = require('@janiscommerce/events');

const { Handler, LambdaError } = require('../lib/index');

describe('Handler', () => {

	const makeLambdaClass = (
		mustHaveClient = false,
		mustHavePayload = false,
		mustHaveUser = false,
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

			get mustHaveUser() {
				return mustHaveUser;
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

	beforeEach(() => {
		oldEnv = { ...process.env };
	});

	afterEach(() => {
		process.env = oldEnv;
	});

	const invalidLambdaFunctions = [1, 'Lambda', true, () => true, {}, []];
	const invalidSessions = [1, true, 'not-a-sesion', []];

	const session = { clientCode: 'defaultClient' };

	context('When Invalid Args is passed and default handling Validate Errors', () => {

		it('Should return an error message if no Lambda Function is passed', async () => {
			assert.deepStrictEqual(await Handler.handle(), { errorType: 'LambdaError', errorMessage: 'No Lambda Function is found' });
		});

		it('Should return an error message if no Lambda Function is not a Class', () => {

			invalidLambdaFunctions.forEach(async lambdaFunction => {
				assert.deepStrictEqual(await Handler.handle(lambdaFunction), { errorType: 'LambdaError', errorMessage: 'Invalid Lambda Function' });
			});
		});

		it('Should return an error message if no valid Session is passed', () => {

			invalidSessions.forEach(async invalidSession => {
				assert.deepStrictEqual(await Handler.handle(makeLambdaClass(), { session: invalidSession }),
					{ errorType: 'LambdaError', errorMessage: 'Invalid Session, must be an Object' });
			});
		});

		it('Should return an error message if Client is not passed when Lambda Function must have one', async () => {
			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(true), { session: {} }),
				{ errorType: 'LambdaError', errorMessage: 'Lambda Function must have Client' });
		});

		it('Should return an error message if Payload is not passed when Lambda Function must have one', async () => {
			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(true, true), { session }),
				{ errorType: 'LambdaError', errorMessage: 'Lambda Function must have Payload' });
		});

		it('Should return an error message if task token is passed and it is not a string', async () => {
			assert.deepStrictEqual(await Handler.handle(makeLambdaClass(), { taskToken: { foo: 'bar' } }),
				{ errorType: 'LambdaError', errorMessage: 'Task token must be a string if present' });
		});

		it('Should return an error message if Lambda Function\'s struct failed', async () => {

			const LambdaClass = makeLambdaClass(true, true, false, () => { throw new Error('Invalid Struct'); });

			assert.deepStrictEqual(await Handler.handle(LambdaClass, { session, body: 'invalid' }),
				{ errorType: 'Error', errorMessage: 'Invalid Struct' });
		});

		it('Should return an error message if Lambda Function\'s validate failed', async () => {

			const LambdaClass = makeLambdaClass(true, true, false, data => data, () => { throw new Error('Invalid Validate'); });

			assert.deepStrictEqual(await Handler.handle(LambdaClass, { session, body: 'valid' }),
				{ errorType: 'Error', errorMessage: 'Invalid Validate' });
		});
	});

	context('When Invalid Args is passed and custom handling Validate Errors', () => {

		class CustomHandler extends Handler {

			static handleValidationError(error) {
				throw error;
			}
		}

		it('Should return an error message if no Lambda Function is passed', async () => {
			await assert.rejects(CustomHandler.handle(), { name: 'LambdaError', code: LambdaError.codes.NO_LAMBDA });
		});

		it('Should return an error message if no Lambda Function is not a Class', () => {

			invalidLambdaFunctions.forEach(async lambdaFunction => {
				await assert.rejects(CustomHandler.handle(lambdaFunction), { name: 'LambdaError', code: LambdaError.codes.INVALID_LAMBDA });
			});
		});

		it('Should return an error message if no valid Session is passed', () => {

			invalidSessions.forEach(async invalidSession => {
				await assert.rejects(CustomHandler.handle(makeLambdaClass(), { session: invalidSession }),
					{ name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });
			});
		});

		it('Should return an error message if Client is not passed when Lambda Function must have one', async () => {
			await assert.rejects(CustomHandler.handle(makeLambdaClass(true), { session: {} }),
				{ name: 'LambdaError', code: LambdaError.codes.NO_CLIENT });
		});

		it('Should return an error message if an invalid Client is passed', async () => {
			await assert.rejects(CustomHandler.handle(makeLambdaClass(true), {
				session: {
					clientCode: ['notAString']
				}
			}),
			{ name: 'LambdaError', code: LambdaError.codes.INVALID_CLIENT });
		});

		it('Should return an error message if Payload is not passed when Lambda Function must have one', async () => {
			await assert.rejects(CustomHandler.handle(makeLambdaClass(true, true), { session }),
				{ name: 'LambdaError', code: LambdaError.codes.NO_PAYLOAD });
		});

		it('Should return an error message if User is not passed when Lambda Function must have one', async () => {
			await assert.rejects(CustomHandler.handle(makeLambdaClass(true, true, true), { session }),
				{ name: 'LambdaError', code: LambdaError.codes.NO_USER });
		});

		it('Should return an error message if an invalid User is passed', async () => {
			await assert.rejects(CustomHandler.handle(makeLambdaClass(true, true, true), {
				session: {
					...session,
					userId: ['notAnObjectId']
				}
			}),
			{ name: 'LambdaError', code: LambdaError.codes.INVALID_USER });
		});

		it('Should return an error message if Lambda Function\'s struct failed', async () => {

			const LambdaClass = makeLambdaClass(true, true, false, () => { throw new Error('Invalid Struct'); });

			await assert.rejects(CustomHandler.handle(LambdaClass, { session, body: 'invalid' }),
				{ name: 'Error', message: 'Invalid Struct' });
		});

		it('Should return an error message if Lambda Function\'s validate failed', async () => {

			const LambdaClass = makeLambdaClass(true, true, false, data => data, () => { throw new Error('Invalid Validate'); });

			await assert.rejects(CustomHandler.handle(LambdaClass, { session, body: 'valid' }),
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

			const body = {
				name: 'Some-Name',
				age: 30,
				pets: ['Cats', 'Birds']
			};

			const apiSession = new ApiSession({ ...session });
			class LambdaFunctionExample {

				process() {
					return {
						session: this.session,
						data: this.data
					};
				}
			}

			assert.deepStrictEqual(await Handler.handle(LambdaFunctionExample, { session, body }), { session: apiSession, data: body });
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

			await Handler.handle(makeLambdaClass(), { session });

			assert.strictEqual(process.env.JANIS_LAMBDA_PAYLOAD, JSON.stringify({ session }));
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

			delete process.env.AWS_LAMBDA_FUNCTION_NAME;
			process.env.JANIS_ENV = 'local';

			await Handler.handle(makeLambdaClass());

			assert.strictEqual(process.env.AWS_LAMBDA_FUNCTION_NAME, 'JanisTestService-local-LambdaFunctionExample');

			sinon.restore();
		});

		it('Should failed if no JANIS_SERVICE_NAME, AWS_LAMBDA_FUNCTION_NAME ENV VAR are setted and Env is local ', async () => {

			delete process.env.AWS_LAMBDA_FUNCTION_NAME;
			delete process.env.JANIS_SERVICE_NAME;
			process.env.JANIS_ENV = 'local';

			await assert.rejects(Handler.handle(makeLambdaClass()), { name: 'LambdaError', code: LambdaError.codes.NO_SERVICE });

			sinon.restore();
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

			class ErrorLambdaFunctionExample {

				process() {
					throw new Error('Process Failed');
				}
			}

			await assert.rejects(Handler.handle(ErrorLambdaFunctionExample), { name: 'Error', message: 'Process Failed' });
		});

		it('Should emit janiscommerce.ended after success process execution', async () => {

			sinon.stub(Events, 'emit');

			await Handler.handle(makeLambdaClass());

			sinon.assert.calledOnceWithExactly(Events.emit, 'janiscommerce.ended');

			sinon.restore();
		});

		it('Should emit janiscommerce.ended after failed process execution', async () => {

			class ErrorLambdaFunctionExample {

				process() {
					throw new Error('Process Failed');
				}
			}

			sinon.stub(Events, 'emit');

			await assert.rejects(Handler.handle(ErrorLambdaFunctionExample), { name: 'Error', message: 'Process Failed' });

			sinon.assert.calledOnceWithExactly(Events.emit, 'janiscommerce.ended');

			sinon.restore();
		});
	});
});
