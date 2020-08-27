'use strict';

const assert = require('assert');
const sandbox = require('sinon');

const { ApiSession } = require('@janiscommerce/api-session');

const { Invoker, LambdaError } = require('../lib/index');
const Lambda = require('../lib/helpers/lambda-wrapper');

describe('Invoker', () => {

	const invokeAsyncResponse = {
		StatusCode: 202,
		Payload: ''
	};

	const functionName = 'FakeLambda';
	const lambdaFunctionName = 'JanisExampleService-test-FakeLambda';

	let oldEnv;

	before(() => {
		oldEnv = process.env;
	});

	after(() => {
		process.env = oldEnv;
	});

	beforeEach(() => {

		sandbox.restore();

		// eslint-disable-next-line no-underscore-dangle
		delete Invoker._lambda;

		process.env.JANIS_SERVICE_NAME = 'example';
		process.env.JANIS_ENV = 'test';
		process.env.AWS_LAMBDA_FUNCTION_NAME = lambdaFunctionName;
		process.env.AWS_REGION = 'us-east-1';
		process.env.MS_PORT = '80';
	});

	describe('Call', () => {

		context('When Call only with Function Name', () => {

			it('Should fail if function name is not passed', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.call(), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if function name is an empty string', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.call(''), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if function name is not string', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.call(['function']), { name: 'LambdaError', code: LambdaError.codes.INVALID_FUNCTION_NAME });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if invoke rejects when region is not set', async () => {

				delete process.env.AWS_REGION;

				const ConfigError = new Error('Missing region in config');
				ConfigError.name = 'ConfigError';

				sandbox.stub(Lambda.prototype, 'invoke').rejects(ConfigError);

				await assert.rejects(Invoker.call('FakeFunction'), { name: 'ConfigError', message: 'Missing region in config' });

				sandbox.assert.calledOnce(Lambda.prototype.invoke);
			});

			it('Should fail if invoke rejects (rare o local cases)', async () => {

				sandbox.stub(Lambda.prototype, 'invoke').rejects(new Error('AWS Failed'));

				await assert.rejects(Invoker.call(functionName), { name: 'Error', message: 'AWS Failed' });

				sandbox.assert.calledOnce(Lambda.prototype.invoke);
			});

			it('Should resolves successfully', async () => {

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});

			it('Should resolves successfully in local env', async () => {

				process.env.JANIS_ENV = 'local';

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: 'JanisExampleService-local-FakeLambda',
					InvocationType: 'Event'
				});
			});

			it('Should cache lambda instance', async () => {

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName), [invokeAsyncResponse]);
				assert.deepStrictEqual(await Invoker.call('OtherFunction'), [invokeAsyncResponse]);

				sandbox.assert.calledTwice(Lambda.prototype.invoke);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: 'JanisExampleService-test-OtherFunction',
					InvocationType: 'Event'
				});
			});
		});

		context('When Call with Function Name and a single Payload', () => {

			it('Should resolves successfully if payload is an object', async () => {

				const payload = { test: 'EXAMPLE' };

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: payload })
				});
			});

			it('Should not add Payload params if payload is an empty object', async () => {

				const payload = {};

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});

			it('Should not add Payload params if payload is a falsy value', async () => {

				const payload = null;

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});
		});

		context('When Call with Function Name and an Array of Payloads', () => {

			it('Should resolves successfully if payload is an single object', async () => {

				const payload = { test: 'EXAMPLE' };

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, [payload]), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: payload })
				});
			});

			it('Should not add Payload params if payload is an empty object', async () => {

				const payload = {};

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, [payload]), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});

			it('Should not add Payload params if payload is a falsy value', async () => {

				const payload = null;

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, [payload]), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});

			it('Should resolves successfully if payload are multiple objects', async () => {

				const payload = [{ test: 'EXAMPLE' }, { test: 'FAKE' }];

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.calledTwice(Lambda.prototype.invoke);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: { test: 'EXAMPLE' } })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: { test: 'FAKE' } })
				});
			});

			it('Should resolves successfully if payload are multiple objects with some empty values', async () => {

				const payload = [{ test: 'EXAMPLE' }, {}, { test: 'FAKE' }];

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.calledThrice(Lambda.prototype.invoke);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: { test: 'EXAMPLE' } })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: { test: 'FAKE' } })
				});
			});
		});
	});

	describe('Client Call', () => {

		context('When Client Call with a single Client', () => {

			const client = 'defaultClient';
			const session = { clientCode: client };
			const apiSession = new ApiSession(session);

			it('Should fail if function name is not passed', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if function name is an empty string', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(''), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if function name is not string', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(['function']), { name: 'LambdaError', code: LambdaError.codes.INVALID_FUNCTION_NAME });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if session is not passed', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName), { name: 'LambdaError', code: LambdaError.codes.NO_SESSION });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if a session without clientCode is passed', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, {
					userId: '6e7d127361152432f36e9c54'
				}), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if client code is an empty string', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, { clientCode: '' }), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if client code is not string', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, 100), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if invoke rejects when region is not set', async () => {

				delete process.env.AWS_REGION;

				const ConfigError = new Error('Missing region in config');
				ConfigError.name = 'ConfigError';

				sandbox.stub(Lambda.prototype, 'invoke').rejects(ConfigError);

				await assert.rejects(Invoker.clientCall(functionName, client), { name: 'ConfigError', message: 'Missing region in config' });

				sandbox.assert.calledOnce(Lambda.prototype.invoke);
			});

			it('Should fail if invoke rejects (rare o local cases)', async () => {

				sandbox.stub(Lambda.prototype, 'invoke').rejects(new Error('AWS Failed'));

				await assert.rejects(Invoker.clientCall(functionName, client), { name: 'Error', message: 'AWS Failed' });

				sandbox.assert.calledOnce(Lambda.prototype.invoke);
			});

			it('Should resolves successfully with no payload', async () => {

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should resolves successfully in local env with no payload', async () => {

				process.env.JANIS_ENV = 'local';

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: 'JanisExampleService-local-FakeLambda',
					InvocationType: 'Event',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should resolves successfully with a single payload', async () => {

				const payload = { test: 'EXAMPLE' };

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession, payload), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session, body: payload })
				});
			});

			it('Should resolves successfully with a single empty payload', async () => {

				const payload = {};

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession, payload), [invokeAsyncResponse]);

				sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should resolves successfully with multiple payloads', async () => {

				const payloads = [{ test: 'EXAMPLE' }, { test: 'FAKE' }];

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession, payloads), [invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.calledTwice(Lambda.prototype.invoke);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session, body: { test: 'EXAMPLE' } })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session, body: { test: 'FAKE' } })
				});
			});
		});

		context('When Client Call with multiple Clients', () => {

			const clients = ['defaultClient', 'otherClient'];
			const sessions = clients.map(clientCode => ({ clientCode }));
			const apiSessions = sessions.map(session => new ApiSession(session));

			it('Should fail if clients codes are an empty array', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, []), { name: 'LambdaError', code: LambdaError.codes.NO_SESSION });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if clients codes has a not string value', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, [100]), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should fail if client code has an empty string', async () => {

				sandbox.stub(Lambda.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, [apiSessions[0], '']), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sandbox.assert.notCalled(Lambda.prototype.invoke);
			});

			it('Should resolves one for each client without payload body', async () => {

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions), [invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.calledTwice(Lambda.prototype.invoke);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0] })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1] })
				});
			});

			it('Should resolves one for each client if payload is an object', async () => {

				const payload = { test: 'EXAMPLE' };

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payload), [invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.calledTwice(Lambda.prototype.invoke);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0], body: payload })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1], body: payload })
				});
			});

			it('Should resolves one for each client if payload is an empty array', async () => {

				const payloads = [];

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payloads), [invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.calledTwice(Lambda.prototype.invoke);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0] })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1] })
				});
			});

			it('Should resolves one for each client if payload is an array with empty object', async () => {

				const payloads = [{}];

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payloads), [invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.calledTwice(Lambda.prototype.invoke);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0] })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1] })
				});
			});

			it('Should resolves one for each client and playload if payload is multiple objects', async () => {

				const payloads = [{ test: 'EXAMPLE' }, { test: 'FAKE' }];

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payloads),
					[invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.callCount(Lambda.prototype.invoke, 4);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0], body: { test: 'EXAMPLE' } })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1], body: { test: 'EXAMPLE' } })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0], body: { test: 'FAKE' } })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1], body: { test: 'FAKE' } })
				});
			});

			it('Should resolves one for each client and playload if payload is multiple objects with some empty objects', async () => {

				const payloads = [{ test: 'EXAMPLE' }, {}];

				sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payloads),
					[invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse]);

				sandbox.assert.callCount(Lambda.prototype.invoke, 4);

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0], body: { test: 'EXAMPLE' } })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1], body: { test: 'EXAMPLE' } })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0] })
				});

				sandbox.assert.calledWithExactly(Lambda.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1] })
				});
			});
		});
	});

	describe('Recall', () => {

		const client = 'defaultClient';
		const session = { clientCode: client };

		it('Should fail if invoke rejects when region is not set', async () => {

			delete process.env.AWS_REGION;

			const ConfigError = new Error('Missing region in config');
			ConfigError.name = 'ConfigError';

			sandbox.stub(Lambda.prototype, 'invoke').rejects(ConfigError);

			await assert.rejects(Invoker.recall(), { name: 'ConfigError', message: 'Missing region in config' });

			sandbox.assert.calledOnce(Lambda.prototype.invoke);
		});

		it('Should fail if invoke rejects (rare o local cases)', async () => {

			sandbox.stub(Lambda.prototype, 'invoke').rejects(new Error('AWS Failed'));

			await assert.rejects(Invoker.recall(), { name: 'Error', message: 'AWS Failed' });

			sandbox.assert.calledOnce(Lambda.prototype.invoke);
		});

		it('Should recall correctly with no payload', async () => {

			sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

			assert.deepStrictEqual(await Invoker.recall(), invokeAsyncResponse);

			sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
				FunctionName: lambdaFunctionName,
				InvocationType: 'Event'
			});
		});

		it('Should recall correctly with client', async () => {

			const payload = JSON.stringify({ session });

			process.env.JANIS_LAMBDA_PAYLOAD = payload;

			sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

			assert.deepStrictEqual(await Invoker.recall(), invokeAsyncResponse);

			sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
				FunctionName: lambdaFunctionName,
				InvocationType: 'Event',
				Payload: payload
			});

			delete process.env.JANIS_LAMBDA_PAYLOAD;
		});

		it('Should recall correctly with body', async () => {

			const payload = JSON.stringify({ body: { test: 'EXAMPLE' } });

			process.env.JANIS_LAMBDA_PAYLOAD = payload;

			sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

			assert.deepStrictEqual(await Invoker.recall(), invokeAsyncResponse);

			sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
				FunctionName: lambdaFunctionName,
				InvocationType: 'Event',
				Payload: payload
			});

			delete process.env.JANIS_LAMBDA_PAYLOAD;
		});

		it('Should recall correctly with client and body', async () => {

			const payload = JSON.stringify({ session, body: { test: 'EXAMPLE' } });

			process.env.JANIS_LAMBDA_PAYLOAD = payload;

			sandbox.stub(Lambda.prototype, 'invoke').resolves(invokeAsyncResponse);

			assert.deepStrictEqual(await Invoker.recall(), invokeAsyncResponse);

			sandbox.assert.calledOnceWithExactly(Lambda.prototype.invoke, {
				FunctionName: lambdaFunctionName,
				InvocationType: 'Event',
				Payload: payload
			});

			delete process.env.JANIS_LAMBDA_PAYLOAD;
		});
	});
});
