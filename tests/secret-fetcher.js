'use strict';

const sinon = require('sinon');
const assert = require('assert');

const { AwsSecretsManager } = require('@janiscommerce/aws-secrets-manager');

const SecretFetcher = require('../lib/helpers/secret-fetcher');
const LambdaError = require('../lib/lambda-error');

describe('Libraries', () => {

	describe('SecretFetcher', () => {

		const fakeAccountIdsByService = {
			pricing: '123456789',
			wms: '987654321'
		};

		const clearSecretCache = () => delete SecretFetcher.secretValue;

		const fakeSecretHandler = () => ({ getValue: sinon.stub() });

		afterEach(() => {
			sinon.restore();
			clearSecretCache();
			delete process.env.JANIS_ENV;
		});

		it('Should get the secret AccountIdsByService', async () => {

			const secretHandler = fakeSecretHandler();

			sinon.stub(AwsSecretsManager, 'secret')
				.returns(secretHandler);

			secretHandler.getValue.resolves(fakeAccountIdsByService);

			await SecretFetcher.fetch();

			assert.deepStrictEqual(SecretFetcher.secretValue, fakeAccountIdsByService);

			sinon.assert.calledOnceWithExactly(AwsSecretsManager.secret, 'AccountsIdsByService');
			sinon.assert.calledOnce(secretHandler.getValue);
		});

		it('Should reject when can\'t get the secret value', async () => {

			const secretHandler = fakeSecretHandler();

			sinon.stub(AwsSecretsManager, 'secret')
				.returns(secretHandler);

			secretHandler.getValue.resolves();

			await assert.rejects(SecretFetcher.fetch(), {
				name: 'LambdaError',
				code: LambdaError.codes.JANIS_SECRET_MISSING
			});

			sinon.assert.calledOnceWithExactly(AwsSecretsManager.secret, 'AccountsIdsByService');
			sinon.assert.calledOnce(secretHandler.getValue);
		});

		it('Should reject when fails at getting the secret value', async () => {

			const secretHandler = fakeSecretHandler();

			sinon.stub(AwsSecretsManager, 'secret')
				.returns(secretHandler);

			secretHandler.getValue.rejects();

			await assert.rejects(SecretFetcher.fetch(), {
				name: 'LambdaError',
				code: LambdaError.codes.JANIS_SECRET_MISSING
			});

			sinon.assert.calledOnceWithExactly(AwsSecretsManager.secret, 'AccountsIdsByService');
			sinon.assert.calledOnce(secretHandler.getValue);
		});

		it('Should return the local secret value (empty object) when the ENV is local', async () => {

			process.env.JANIS_ENV = 'local';

			sinon.stub(SecretFetcher, 'isLocalEnv')
				.get(() => true);

			sinon.spy(AwsSecretsManager, 'secret');

			await SecretFetcher.fetch();

			assert.deepStrictEqual(SecretFetcher.secretValue, {});

			sinon.assert.notCalled(AwsSecretsManager.secret);
		});
	});
});
