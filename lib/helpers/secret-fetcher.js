'use strict';

const { AwsSecretsManager } = require('@janiscommerce/aws-secrets-manager');

const LambdaError = require('../lambda-error');

const isLocalEnv = require('./is-local-env');

module.exports = class SecretFetcher {

	/**
	 * Get the secret name of Janis Service
	 * @returns {string}
	 */
	static get secretName() {
		return 'AccountsIdsByService';
	}

	static get localSecretValue() {
		return {};
	}

	/**
	 * Request the secret value to AwsSecretManager
	 * @throws {LambdaError} If the secretValue is missing
	 */
	static async fetch() {

		if(isLocalEnv()) {
			this.secretValue = this.localSecretValue;
			return;
		}

		try {

			const secretHandler = AwsSecretsManager.secret(this.secretName);

			this.secretValue = await secretHandler.getValue();
			this.secretValue = this.secretValue || false;

		} catch(err) {
			this.secretValue = false;
		}

		if(this.secretValue === false)
			throw new LambdaError('Secret is missing', LambdaError.codes.JANIS_SECRET_MISSING);
	}
};
