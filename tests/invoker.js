'use strict';

const assert = require('assert');
const sinon = require('sinon');

const { ApiSession } = require('@janiscommerce/api-session');
const Settings = require('@janiscommerce/settings');

const { Invoker, LambdaError } = require('../lib/index');
const { LambdaWrapper } = require('../lib/helpers/aws-wrappers');
const LambdaInstance = require('../lib/helpers/lambda-instance');
const SecretFetcher = require('../lib/helpers/secret-fetcher');

describe('Invoker', () => {

	const invokeAsyncResponse = {
		StatusCode: 202,
		Payload: ''
	};

	const functionName = 'FakeLambda';
	const lambdaFunctionName = 'JanisExampleService-test-FakeLambda';

	const fakeServiceAccountId = '123456789012';
	const lambdaExternalFunctionName = 'JanisSomeServiceService-test-FakeLambda';

	const fakeSecretValue = {
		'some-service': fakeServiceAccountId
	};

	const localServicePorts = {
		'some-service': 1234
	};

	let oldEnv;

	beforeEach(() => {

		sinon.restore();

		oldEnv = { ...process.env };
		delete Invoker._localServicePorts; // eslint-disable-line no-underscore-dangle
		delete LambdaInstance._basicInstance; // eslint-disable-line no-underscore-dangle
		delete LambdaInstance.cachedInstances;

		process.env.JANIS_SERVICE_NAME = 'example';
		process.env.JANIS_ENV = 'test';
		process.env.AWS_LAMBDA_FUNCTION_NAME = lambdaFunctionName;
		process.env.AWS_REGION = 'us-east-1';
		process.env.MS_PORT = '80';
	});

	afterEach(() => {
		process.env = oldEnv;
		delete SecretFetcher.secretValue;
	});

	describe('Call', () => {

		context('When Call only with Function Name', () => {

			it('Should fail if function name is not passed', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.call(), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if function name is an empty string', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.call(''), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if function name is not string', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.call(['function']), { name: 'LambdaError', code: LambdaError.codes.INVALID_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if invoke rejects when region is not set', async () => {

				delete process.env.AWS_REGION;

				const ConfigError = new Error('Missing region in config');
				ConfigError.name = 'ConfigError';

				sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(ConfigError);

				await assert.rejects(Invoker.call(functionName), { name: 'ConfigError', message: 'Missing region in config' });

				sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if invoke rejects (rare o local cases)', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(new Error('AWS Failed'));

				await assert.rejects(Invoker.call(functionName), { name: 'Error', message: 'AWS Failed' });

				sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
			});

			it('Should resolves successfully', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});

			it('Should resolves successfully in local env', async () => {

				process.env.JANIS_ENV = 'local';

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: 'JanisExampleService-local-FakeLambda',
					InvocationType: 'Event'
				});
			});

			it('Should cache lambda instance', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName), [invokeAsyncResponse]);
				assert.deepStrictEqual(await Invoker.call('OtherFunction'), [invokeAsyncResponse]);

				sinon.assert.calledTwice(LambdaWrapper.prototype.invoke);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: 'JanisExampleService-test-OtherFunction',
					InvocationType: 'Event'
				});
			});
		});

		context('When Call with Function Name and a single Payload', () => {

			it('Should resolves successfully if payload is an object', async () => {

				const payload = { test: 'EXAMPLE' };

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: payload })
				});
			});

			it('Should not add Payload params if payload is an empty object', async () => {

				const payload = {};

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});

			it('Should not add Payload params if payload is a falsy value', async () => {

				const payload = null;

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});
		});

		context('When Call with Function Name and an Array of Payloads', () => {

			it('Should resolves successfully if payload is an single object', async () => {

				const payload = { test: 'EXAMPLE' };

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, [payload]), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: payload })
				});
			});

			it('Should not add Payload params if payload is an empty object', async () => {

				const payload = {};

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, [payload]), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});

			it('Should not add Payload params if payload is a falsy value', async () => {

				const payload = null;

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, [payload]), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});
			});

			it('Should resolves successfully if payload are multiple objects', async () => {

				const payload = [{ test: 'EXAMPLE' }, { test: 'FAKE' }];

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.calledTwice(LambdaWrapper.prototype.invoke);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: { test: 'EXAMPLE' } })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: { test: 'FAKE' } })
				});
			});

			it('Should resolves successfully if payload are multiple objects with some empty values', async () => {

				const payload = [{ test: 'EXAMPLE' }, {}, { test: 'FAKE' }];

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.call(functionName, payload), [invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.calledThrice(LambdaWrapper.prototype.invoke);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ body: { test: 'EXAMPLE' } })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event'
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
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

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if function name is an empty string', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(''), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if function name is not string', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(['function']), { name: 'LambdaError', code: LambdaError.codes.INVALID_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if session is not passed', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName), { name: 'LambdaError', code: LambdaError.codes.NO_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if a session without clientCode is passed', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, {
					userId: '6e7d127361152432f36e9c54'
				}), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if client code is an empty string', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, { clientCode: '' }), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if client code is not string', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, 100), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if invoke rejects when region is not set', async () => {

				delete process.env.AWS_REGION;

				const ConfigError = new Error('Missing region in config');
				ConfigError.name = 'ConfigError';

				sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(ConfigError);

				await assert.rejects(Invoker.clientCall(functionName, client), { name: 'ConfigError', message: 'Missing region in config' });

				sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if invoke rejects (rare o local cases)', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(new Error('AWS Failed'));

				await assert.rejects(Invoker.clientCall(functionName, client), { name: 'Error', message: 'AWS Failed' });

				sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
			});

			it('Should resolves successfully with no payload', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should resolves successfully in local env with no payload', async () => {

				process.env.JANIS_ENV = 'local';

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: 'JanisExampleService-local-FakeLambda',
					InvocationType: 'Event',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should resolves successfully with a single payload', async () => {

				const payload = { test: 'EXAMPLE' };

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession, payload), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session, body: payload })
				});
			});

			it('Should resolves successfully with a single empty payload', async () => {

				const payload = {};

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession, payload), [invokeAsyncResponse]);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should resolves successfully with multiple payloads', async () => {

				const payloads = [{ test: 'EXAMPLE' }, { test: 'FAKE' }];

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSession, payloads), [invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.calledTwice(LambdaWrapper.prototype.invoke);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session, body: { test: 'EXAMPLE' } })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
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

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, []), { name: 'LambdaError', code: LambdaError.codes.NO_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if clients codes has a not string value', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, [100]), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if client code has an empty string', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.clientCall(functionName, [apiSessions[0], '']), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should resolves one for each client without payload body', async () => {

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions), [invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.calledTwice(LambdaWrapper.prototype.invoke);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0] })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1] })
				});
			});

			it('Should resolves one for each client if payload is an object', async () => {

				const payload = { test: 'EXAMPLE' };

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payload), [invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.calledTwice(LambdaWrapper.prototype.invoke);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0], body: payload })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1], body: payload })
				});
			});

			it('Should resolves one for each client if payload is an empty array', async () => {

				const payloads = [];

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payloads), [invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.calledTwice(LambdaWrapper.prototype.invoke);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0] })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1] })
				});
			});

			it('Should resolves one for each client if payload is an array with empty object', async () => {

				const payloads = [{}];

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payloads), [invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.calledTwice(LambdaWrapper.prototype.invoke);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0] })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1] })
				});
			});

			it('Should resolves one for each client and playload if payload is multiple objects', async () => {

				const payloads = [{ test: 'EXAMPLE' }, { test: 'FAKE' }];

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payloads),
					[invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.callCount(LambdaWrapper.prototype.invoke, 4);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0], body: { test: 'EXAMPLE' } })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1], body: { test: 'EXAMPLE' } })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0], body: { test: 'FAKE' } })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1], body: { test: 'FAKE' } })
				});
			});

			it('Should resolves one for each client and playload if payload is multiple objects with some empty objects', async () => {

				const payloads = [{ test: 'EXAMPLE' }, {}];

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				assert.deepStrictEqual(await Invoker.clientCall(functionName, apiSessions, payloads),
					[invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse, invokeAsyncResponse]);

				sinon.assert.callCount(LambdaWrapper.prototype.invoke, 4);

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0], body: { test: 'EXAMPLE' } })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1], body: { test: 'EXAMPLE' } })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[0] })
				});

				sinon.assert.calledWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: lambdaFunctionName,
					InvocationType: 'Event',
					Payload: JSON.stringify({ session: sessions[1] })
				});
			});
		});
	});

	describe('serviceCall', () => {

		context('When serviceCall only with Function Name', () => {

			it('Should fail if service code is not passed', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceCall(), { name: 'LambdaError', code: LambdaError.codes.NO_SERVICE_CODE });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service code is an empty string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceCall(''), { name: 'LambdaError', code: LambdaError.codes.NO_SERVICE_CODE });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service code is not an string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceCall(['serviceCode']), { name: 'LambdaError', code: LambdaError.codes.INVALID_SERVICE_CODE });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service name is not passed', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceCall('some-service'), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service name is an empty string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceCall('some-service', ''), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service name is not an string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceCall('some-service', ['functionName']), {
					name: 'LambdaError',
					code: LambdaError.codes.INVALID_FUNCTION_NAME
				});

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if can\'t get the service Account ID from AWS Secret', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = {};

				await assert.rejects(Invoker.serviceCall('some-service', 'some-function'), {
					name: 'LambdaError',
					code: LambdaError.codes.NO_SERVICE_ACCOUNT_ID
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);
				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if invoker rejects when region is not set', async () => {

				delete process.env.AWS_REGION;

				const ConfigError = new Error('Missing region in config');
				ConfigError.name = 'ConfigError';

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(ConfigError);

				await assert.rejects(Invoker.serviceCall('some-service', functionName), { name: 'ConfigError', message: 'Missing region in config' });

				sinon.assert.calledOnce(SecretFetcher.fetch);
				sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if invoke rejects (rare or local cases)', async () => {

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(new Error('AWS Failed'));

				await assert.rejects(Invoker.serviceCall('some-service', functionName), { name: 'Error', message: 'AWS Failed' });

				sinon.assert.calledOnce(SecretFetcher.fetch);
				sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
			});

			it('Should return the lambda response formatted', async () => {

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				const lambdaResponse = await Invoker.serviceCall('some-service', functionName);

				assert.deepStrictEqual(lambdaResponse, {
					statusCode: invokeAsyncResponse.StatusCode,
					payload: {}
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse'
				});
			});

			it('Should resolve successfully in local env', async () => {

				process.env.JANIS_ENV = 'local';

				sinon.stub(Settings, 'get')
					.withArgs('localServicePorts')
					.returns(localServicePorts);

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				sinon.spy(SecretFetcher, 'fetch');

				const lambdaResponse = await Invoker.serviceCall('some-service', functionName);

				sinon.assert.notCalled(SecretFetcher.fetch);

				assert.deepStrictEqual(lambdaResponse, {
					statusCode: invokeAsyncResponse.StatusCode,
					payload: {}
				});

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: 'JanisSomeServiceService-local-FakeLambda',
					InvocationType: 'RequestResponse'
				});
			});

			it('Should reject when can\'t find the local service port in local env', async () => {

				process.env.JANIS_ENV = 'local';

				Invoker._localServicePorts = {}; // eslint-disable-line no-underscore-dangle

				sinon.spy(Settings, 'get');
				sinon.spy(LambdaWrapper.prototype, 'invoke');
				sinon.spy(SecretFetcher, 'fetch');

				await assert.rejects(Invoker.serviceCall('some-service', functionName), {
					name: 'LambdaError',
					code: LambdaError.codes.NO_LOCAL_SERVICE_PORT
				});

				sinon.assert.notCalled(Settings.get);
				sinon.assert.notCalled(SecretFetcher.fetch);
				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should reject if the lambda response status code is 400 or higher', async () => {

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves({
					StatusCode: 400,
					Payload: '{"errorMessage": "Error message"}'
				});

				await assert.rejects(Invoker.serviceCall('some-service', functionName), {
					name: 'LambdaError',
					code: LambdaError.codes.INVOCATION_FAILED
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse'
				});
			});
		});

		context('When serviceCall with Function Name and Payload', () => {

			it('Should return the lambda response formatted if the payload is an object', async () => {

				const payload = { some: 'data' };

				const lambdaResponse = {
					StatusCode: 202,
					Payload: '{"message": "Success"}'
				};

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(lambdaResponse);

				const response = await Invoker.serviceCall('some-service', functionName, payload);

				assert.deepStrictEqual(response, {
					statusCode: lambdaResponse.StatusCode,
					payload: JSON.parse(lambdaResponse.Payload)
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse',
					Payload: JSON.stringify({ body: payload })
				});
			});

			it('Should not add Payload params if the payload is an empty object', async () => {

				const payload = {};

				const lambdaResponse = {
					StatusCode: 202,
					Payload: 'OK'
				};

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(lambdaResponse);

				const response = await Invoker.serviceCall('some-service', functionName, payload);

				assert.deepStrictEqual(response, {
					statusCode: lambdaResponse.StatusCode,
					payload: lambdaResponse.Payload
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse'
				});
			});

			it('Should not add Payload params if the payload is a falsy value', async () => {

				const payload = null;

				const lambdaResponse = {
					StatusCode: 202
				};

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(lambdaResponse);

				const response = await Invoker.serviceCall('some-service', functionName, payload);

				assert.deepStrictEqual(response, {
					statusCode: lambdaResponse.StatusCode,
					payload: {}
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse'
				});
			});
		});
	});

	describe('serviceSafeCall()', () => {

		it('Should not reject if the lambda response status code is 400 or higher', async () => {

			sinon.stub(SecretFetcher, 'fetch')
				.resolves();

			SecretFetcher.secretValue = fakeSecretValue;

			sinon.stub(LambdaInstance, 'getInstanceWithRole')
				.resolves(new LambdaWrapper());

			sinon.stub(LambdaWrapper.prototype, 'invoke').resolves({
				StatusCode: 400,
				Payload: '{"errorMessage": "Error message"}'
			});

			const response = await Invoker.serviceSafeCall('some-service', functionName);

			assert.deepStrictEqual(response, {
				statusCode: 400,
				payload: {
					errorMessage: 'Error message'
				}
			});

			sinon.assert.calledOnce(SecretFetcher.fetch);

			sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
				FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
				InvocationType: 'RequestResponse'
			});
		});
	});

	describe('serviceClientCall', () => {

		const client = 'defaultClient';
		const session = { clientCode: client, serviceName: 'example' };
		const apiSession = new ApiSession(session);

		context('When serviceClientCall only with Function Name', () => {

			it('Should fail if service code is not passed', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall(), { name: 'LambdaError', code: LambdaError.codes.NO_SERVICE_CODE });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service code is an empty string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall(''), { name: 'LambdaError', code: LambdaError.codes.NO_SERVICE_CODE });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service code is not an string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall(['serviceCode']), { name: 'LambdaError', code: LambdaError.codes.INVALID_SERVICE_CODE });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service name is not passed', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall('some-service'), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service name is an empty string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall('some-service', ''), { name: 'LambdaError', code: LambdaError.codes.NO_FUNCTION_NAME });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if service name is not an string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall('some-service', ['functionName']), {
					name: 'LambdaError',
					code: LambdaError.codes.INVALID_FUNCTION_NAME
				});

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if session is not passed', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall('some-service', functionName), { name: 'LambdaError', code: LambdaError.codes.NO_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if session without clientCode is passed', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall('some-service', functionName, {
					userId: '6e7d127361152432f36e9c54'
				}), { name: 'LambdaError', code: LambdaError.codes.INVALID_SESSION });

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if clientCode is an empty string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall('some-service', functionName, { clientCode: '' }), {
					name: 'LambdaError',
					code: LambdaError.codes.INVALID_SESSION
				});

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if clientCode is not an string', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				await assert.rejects(Invoker.serviceClientCall('some-service', functionName, 100), {
					name: 'LambdaError',
					code: LambdaError.codes.INVALID_SESSION
				});

				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if can\'t get the service Account ID from AWS Secret', async () => {

				sinon.spy(LambdaWrapper.prototype, 'invoke');

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = {};

				await assert.rejects(Invoker.serviceClientCall('some-service', 'some-function', client), {
					name: 'LambdaError',
					code: LambdaError.codes.NO_SERVICE_ACCOUNT_ID
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);
				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if invoker rejects when region is not set', async () => {

				delete process.env.AWS_REGION;

				const ConfigError = new Error('Missing region in config');
				ConfigError.name = 'ConfigError';

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(ConfigError);

				await assert.rejects(Invoker.serviceClientCall('some-service', functionName, client), {
					name: 'ConfigError',
					message: 'Missing region in config'
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);
				sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
			});

			it('Should fail if invoke rejects (rare or local cases)', async () => {

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(new Error('AWS Failed'));

				await assert.rejects(Invoker.serviceClientCall('some-service', functionName, client), { name: 'Error', message: 'AWS Failed' });

				sinon.assert.calledOnce(SecretFetcher.fetch);
				sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
			});

			it('Should return the lambda response formatted', async () => {

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				const lambdaResponse = await Invoker.serviceClientCall('some-service', functionName, apiSession);

				assert.deepStrictEqual(lambdaResponse, {
					statusCode: invokeAsyncResponse.StatusCode,
					payload: {}
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should resolve successfully in local env', async () => {

				process.env.JANIS_ENV = 'local';

				sinon.stub(Settings, 'get')
					.withArgs('localServicePorts')
					.returns(localServicePorts);

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

				sinon.spy(SecretFetcher, 'fetch');

				const lambdaResponse = await Invoker.serviceClientCall('some-service', functionName, client);

				sinon.assert.notCalled(SecretFetcher.fetch);

				assert.deepStrictEqual(lambdaResponse, {
					statusCode: invokeAsyncResponse.StatusCode,
					payload: {}
				});

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: 'JanisSomeServiceService-local-FakeLambda',
					InvocationType: 'RequestResponse',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should reject when can\'t find the local service port in local env', async () => {

				process.env.JANIS_ENV = 'local';

				sinon.stub(Settings, 'get')
					.withArgs('localServicePorts')
					.returns();

				sinon.spy(LambdaWrapper.prototype, 'invoke');
				sinon.spy(SecretFetcher, 'fetch');

				await assert.rejects(Invoker.serviceClientCall('some-service', functionName, client), {
					name: 'LambdaError',
					code: LambdaError.codes.NO_LOCAL_SERVICE_PORT
				});

				sinon.assert.notCalled(SecretFetcher.fetch);
				sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
			});

			it('Should reject if the lambda response status code is 400 or higher', async () => {

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves({
					StatusCode: 400,
					Payload: '{"errorMessage": "Error message"}'
				});

				await assert.rejects(Invoker.serviceClientCall('some-service', functionName, client), {
					name: 'LambdaError',
					code: LambdaError.codes.INVOCATION_FAILED
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse',
					Payload: JSON.stringify({ session })
				});
			});
		});

		context('When serviceClientCall with Function Name and Payload', () => {

			it('Should return the lambda response formatted if the payload is an object', async () => {

				const payload = { some: 'data' };

				const lambdaResponse = {
					StatusCode: 202,
					Payload: '{"message": "Success"}'
				};

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(lambdaResponse);

				const response = await Invoker.serviceClientCall('some-service', functionName, client, payload);

				assert.deepStrictEqual(response, {
					statusCode: lambdaResponse.StatusCode,
					payload: JSON.parse(lambdaResponse.Payload)
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse',
					Payload: JSON.stringify({ session, body: payload })
				});
			});

			it('Should not add Payload params if the payload is an empty object', async () => {

				const payload = {};

				const lambdaResponse = {
					StatusCode: 202,
					Payload: 'OK'
				};

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(lambdaResponse);

				const response = await Invoker.serviceClientCall('some-service', functionName, client, payload);

				assert.deepStrictEqual(response, {
					statusCode: lambdaResponse.StatusCode,
					payload: lambdaResponse.Payload
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse',
					Payload: JSON.stringify({ session })
				});
			});

			it('Should not add Payload params if the payload is a falsy value', async () => {

				const payload = null;

				const lambdaResponse = {
					StatusCode: 202
				};

				sinon.stub(SecretFetcher, 'fetch')
					.resolves();

				SecretFetcher.secretValue = fakeSecretValue;

				sinon.stub(LambdaInstance, 'getInstanceWithRole')
					.resolves(new LambdaWrapper());

				sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(lambdaResponse);

				const response = await Invoker.serviceClientCall('some-service', functionName, client, payload);

				assert.deepStrictEqual(response, {
					statusCode: lambdaResponse.StatusCode,
					payload: {}
				});

				sinon.assert.calledOnce(SecretFetcher.fetch);

				sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
					FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
					InvocationType: 'RequestResponse',
					Payload: JSON.stringify({ session })
				});
			});
		});
	});

	describe('serviceSafeClientCall()', () => {

		it('Should not reject if the lambda response status code is 400 or higher', async () => {

			sinon.stub(SecretFetcher, 'fetch')
				.resolves();

			SecretFetcher.secretValue = fakeSecretValue;

			sinon.stub(LambdaInstance, 'getInstanceWithRole')
				.resolves(new LambdaWrapper());

			sinon.stub(LambdaWrapper.prototype, 'invoke').resolves({
				StatusCode: 400,
				FunctionError: 'Timeout',
				Payload: '{"errorMessage": "Error message"}'
			});

			const response = await Invoker.serviceSafeClientCall('some-service', 'fake-lambda', 'defaultClient');

			assert.deepStrictEqual(response, {
				statusCode: 400,
				functionError: 'Timeout',
				payload: {
					errorMessage: 'Error message'
				}
			});

			sinon.assert.calledOnce(SecretFetcher.fetch);

			sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
				FunctionName: `${fakeServiceAccountId}:function:${lambdaExternalFunctionName}`,
				InvocationType: 'RequestResponse',
				Payload: JSON.stringify({ session: { clientCode: 'defaultClient', serviceName: 'example' } })
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

			sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(ConfigError);

			await assert.rejects(Invoker.recall(), { name: 'ConfigError', message: 'Missing region in config' });

			sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
		});

		it('Should fail if invoke rejects (rare o local cases)', async () => {

			sinon.stub(LambdaWrapper.prototype, 'invoke').rejects(new Error('AWS Failed'));

			await assert.rejects(Invoker.recall(), { name: 'Error', message: 'AWS Failed' });

			sinon.assert.calledOnce(LambdaWrapper.prototype.invoke);
		});

		it('Should recall correctly with no payload', async () => {

			delete process.env.JANIS_LAMBDA_PAYLOAD;

			sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

			assert.deepStrictEqual(await Invoker.recall(), invokeAsyncResponse);

			sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
				FunctionName: lambdaFunctionName,
				InvocationType: 'Event'
			});
		});

		it('Should recall correctly with client', async () => {

			const payload = JSON.stringify({ session });

			process.env.JANIS_LAMBDA_PAYLOAD = payload;

			sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

			assert.deepStrictEqual(await Invoker.recall(), invokeAsyncResponse);

			sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
				FunctionName: lambdaFunctionName,
				InvocationType: 'Event',
				Payload: payload
			});

			delete process.env.JANIS_LAMBDA_PAYLOAD;
		});

		it('Should recall correctly with body', async () => {

			const payload = JSON.stringify({ body: { test: 'EXAMPLE' } });

			process.env.JANIS_LAMBDA_PAYLOAD = payload;

			sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

			assert.deepStrictEqual(await Invoker.recall(), invokeAsyncResponse);

			sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
				FunctionName: lambdaFunctionName,
				InvocationType: 'Event',
				Payload: payload
			});

			delete process.env.JANIS_LAMBDA_PAYLOAD;
		});

		it('Should recall correctly with client and body', async () => {

			const payload = JSON.stringify({ session, body: { test: 'EXAMPLE' } });

			process.env.JANIS_LAMBDA_PAYLOAD = payload;

			sinon.stub(LambdaWrapper.prototype, 'invoke').resolves(invokeAsyncResponse);

			assert.deepStrictEqual(await Invoker.recall(), invokeAsyncResponse);

			sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
				FunctionName: lambdaFunctionName,
				InvocationType: 'Event',
				Payload: payload
			});

			delete process.env.JANIS_LAMBDA_PAYLOAD;
		});
	});

	describe('apiCall()', () => {

		it('Should reject when no received namespace', async () => {

			sinon.spy(SecretFetcher, 'fetch');

			sinon.spy(LambdaWrapper.prototype, 'invoke');

			await assert.rejects(
				Invoker.apiCall('catalog', 'Update-Product'),
				{ name: 'LambdaError', code: LambdaError.codes.NO_ENDPOINT_PARAMS }
			);

			sinon.assert.notCalled(SecretFetcher.fetch);

			sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
		});

		it('Should reject when no method was received', async () => {

			sinon.spy(SecretFetcher, 'fetch');

			sinon.spy(LambdaWrapper.prototype, 'invoke');

			await assert.rejects(
				Invoker.apiCall('catalog', 'Update-Product', 'product'),
				{ name: 'LambdaError', code: LambdaError.codes.NO_ENDPOINT_PARAMS }
			);

			sinon.assert.notCalled(SecretFetcher.fetch);

			sinon.assert.notCalled(LambdaWrapper.prototype.invoke);
		});

		it('Should invoke the api lambda of the service', async () => {

			sinon.stub(SecretFetcher, 'fetch')
				.resolves();

			const accountId = 123456789;

			SecretFetcher.secretValue = { catalog: accountId };

			sinon.stub(LambdaInstance, 'getInstanceWithRole')
				.resolves(new LambdaWrapper());

			const event = {
				path: { id: '62040c863384d9a503460de2' }
			};

			sinon.stub(LambdaWrapper.prototype, 'invoke')
				.resolves({});

			await Invoker.apiCall('catalog', 'Update-Product', 'product', 'update', event);

			sinon.assert.calledOnce(SecretFetcher.fetch);

			sinon.assert.calledOnceWithExactly(LambdaWrapper.prototype.invoke, {
				FunctionName: `${accountId}:function:API-Catalog-Update-Product-test`,
				InvocationType: 'RequestResponse',
				Payload: {
					namespace: 'product',
					method: 'update',
					body: event
				}
			});
		});
	});
});
