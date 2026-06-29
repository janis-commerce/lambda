'use strict';

const sinon = require('sinon');
const assert = require('assert');
const { mockClient } = require('aws-sdk-client-mock');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { AwsSecretsManager } = require('@janiscommerce/aws-secrets-manager');
const lllog = require('lllog');

const SecretFetcher = require('../../lib/helpers/secret-fetcher');
const LambdaError = require('../../lib/lambda-error');

const loggerProto = Object.getPrototypeOf(lllog());

describe('Libraries', () => {

	describe('SecretFetcher', () => {

		const fakeAccountIdsByService = {
			pricing: '123456789012',
			wms: '987654321098'
		};

		const fakeSecretHandler = () => ({ getValue: sinon.stub() });

		let ssmClientMock;

		beforeEach(() => {
			ssmClientMock = mockClient(SSMClient);
		});

		afterEach(() => {
			sinon.restore();
			ssmClientMock.reset();
			delete SecretFetcher.secretValue;
			delete process.env.JANIS_ENV;
			delete process.env.DEVOPS_ACCOUNT_ID;
			delete process.env.AWS_REGION;
		});

		context('When DEVOPS_ACCOUNT_ID is set (Parameter Store path)', () => {

			beforeEach(() => {
				process.env.DEVOPS_ACCOUNT_ID = '111122223333';
				process.env.AWS_REGION = 'us-east-1';
			});

			it('Should get accounts-ids from Parameter Store and cache the parsed value', async () => {

				ssmClientMock.on(GetParameterCommand).resolves({
					Parameter: { Value: JSON.stringify(fakeAccountIdsByService) }
				});

				await SecretFetcher.fetch();

				assert.deepStrictEqual(SecretFetcher.secretValue, fakeAccountIdsByService);

				const calls = ssmClientMock.commandCalls(GetParameterCommand);
				assert.strictEqual(calls.length, 1);
				assert.deepStrictEqual(calls[0].args[0].input, {
					Name: 'arn:aws:ssm:us-east-1:111122223333:parameter/accountsIdsByService'
				});
			});

			it('Should use internal cache and call Parameter Store only once across multiple fetch() calls', async () => {

				ssmClientMock.on(GetParameterCommand).resolves({
					Parameter: { Value: JSON.stringify(fakeAccountIdsByService) }
				});

				await SecretFetcher.fetch();
				await SecretFetcher.fetch();
				await SecretFetcher.fetch();

				assert.deepStrictEqual(SecretFetcher.secretValue, fakeAccountIdsByService);
				assert.strictEqual(ssmClientMock.commandCalls(GetParameterCommand).length, 1);
			});

			it('Should throw JANIS_SECRET_MISSING when Parameter Store returns empty Parameter', async () => {

				ssmClientMock.on(GetParameterCommand).resolves({ Parameter: null });

				await assert.rejects(SecretFetcher.fetch(), {
					name: 'LambdaError',
					code: LambdaError.codes.JANIS_SECRET_MISSING
				});
			});

			it('Should throw JANIS_SECRET_MISSING when Parameter Store returns Parameter without Value', async () => {

				ssmClientMock.on(GetParameterCommand).resolves({ Parameter: {} });

				await assert.rejects(SecretFetcher.fetch(), {
					name: 'LambdaError',
					code: LambdaError.codes.JANIS_SECRET_MISSING
				});
			});

			it('Should throw JANIS_SECRET_MISSING when GetParameterCommand fails — no fallback to Secrets Manager', async () => {

				ssmClientMock.on(GetParameterCommand).rejects(new Error('ParameterNotFound'));

				sinon.stub(loggerProto, 'error');
				sinon.spy(AwsSecretsManager, 'secret');

				await assert.rejects(SecretFetcher.fetch(), {
					name: 'LambdaError',
					code: LambdaError.codes.JANIS_SECRET_MISSING
				});

				sinon.assert.notCalled(AwsSecretsManager.secret);
			});
		});

		context('When DEVOPS_ACCOUNT_ID is missing (Secrets Manager fallback)', () => {

			it('Should emit a logger.warn and fall back to Secrets Manager', async () => {

				const secretHandler = fakeSecretHandler();

				const warnStub = sinon.stub(loggerProto, 'warn');

				sinon.stub(AwsSecretsManager, 'secret').returns(secretHandler);
				secretHandler.getValue.resolves(fakeAccountIdsByService);

				await SecretFetcher.fetch();

				assert.deepStrictEqual(SecretFetcher.secretValue, fakeAccountIdsByService);

				sinon.assert.calledOnce(warnStub);
				sinon.assert.calledOnceWithExactly(AwsSecretsManager.secret, 'AccountsIdsByService');
				sinon.assert.calledOnce(secretHandler.getValue);
				assert.strictEqual(ssmClientMock.commandCalls(GetParameterCommand).length, 0);
			});

			it('Should treat an empty DEVOPS_ACCOUNT_ID as missing and fall back to Secrets Manager', async () => {

				process.env.DEVOPS_ACCOUNT_ID = '';

				const secretHandler = fakeSecretHandler();

				const warnStub = sinon.stub(loggerProto, 'warn');

				sinon.stub(AwsSecretsManager, 'secret').returns(secretHandler);
				secretHandler.getValue.resolves(fakeAccountIdsByService);

				await SecretFetcher.fetch();

				assert.deepStrictEqual(SecretFetcher.secretValue, fakeAccountIdsByService);

				sinon.assert.calledOnce(warnStub);
				sinon.assert.calledOnceWithExactly(AwsSecretsManager.secret, 'AccountsIdsByService');
				assert.strictEqual(ssmClientMock.commandCalls(GetParameterCommand).length, 0);
			});

			it('Should throw JANIS_SECRET_MISSING when Secrets Manager returns empty value', async () => {

				const secretHandler = fakeSecretHandler();

				sinon.stub(loggerProto, 'warn');
				sinon.stub(AwsSecretsManager, 'secret').returns(secretHandler);
				secretHandler.getValue.resolves();

				await assert.rejects(SecretFetcher.fetch(), {
					name: 'LambdaError',
					code: LambdaError.codes.JANIS_SECRET_MISSING
				});
			});

			it('Should throw JANIS_SECRET_MISSING when Secrets Manager call fails', async () => {

				const secretHandler = fakeSecretHandler();

				sinon.stub(loggerProto, 'warn');
				sinon.stub(loggerProto, 'error');
				sinon.stub(AwsSecretsManager, 'secret').returns(secretHandler);
				secretHandler.getValue.rejects();

				await assert.rejects(SecretFetcher.fetch(), {
					name: 'LambdaError',
					code: LambdaError.codes.JANIS_SECRET_MISSING
				});
			});
		});

		context('When running in local environment', () => {

			it('Should return empty object without calling Parameter Store or Secrets Manager', async () => {

				process.env.JANIS_ENV = 'local';

				sinon.spy(AwsSecretsManager, 'secret');

				await SecretFetcher.fetch();

				assert.deepStrictEqual(SecretFetcher.secretValue, {});

				sinon.assert.notCalled(AwsSecretsManager.secret);
				assert.strictEqual(ssmClientMock.commandCalls(GetParameterCommand).length, 0);
			});
		});
	});
});
