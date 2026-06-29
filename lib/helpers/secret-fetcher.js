'use strict';

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { AwsSecretsManager } = require('@janiscommerce/aws-secrets-manager');

const logger = require('lllog')();

const LambdaError = require('../lambda-error');

const isLocalEnv = require('./is-local-env');

const PARAMETER_NAME = 'accountsIdsByService';

module.exports = class SecretFetcher {

	/**
	 * Get the secret name of Janis Service (kept for backward-compat with any direct callers)
	 * @returns {string}
	 */
	static get secretName() {
		return 'AccountsIdsByService';
	}

	static get localSecretValue() {
		return {};
	}

	/**
	 * Build the Parameter Store ARN for the shared Devops parameter
	 * @returns {string}
	 */
	static get parameterArn() {
		return `arn:aws:ssm:${process.env.AWS_REGION}:${process.env.DEVOPS_ACCOUNT_ID}:parameter/${PARAMETER_NAME}`;
	}

	/**
	 * Fetch accounts-ids-by-service from Parameter Store.
	 * Falls back to Secrets Manager (with a warning) only when DEVOPS_ACCOUNT_ID is absent.
	 * @throws {LambdaError} If the parameter/secret value is missing or the SSM call fails
	 */
	static async fetch() {

		if(this.secretValue)
			return;

		if(isLocalEnv()) {
			this.secretValue = this.localSecretValue;
			return;
		}

		if(!process.env.DEVOPS_ACCOUNT_ID) {
			logger.warn('DEVOPS_ACCOUNT_ID env var is not set, falling back to Secrets Manager', {
				hint: 'Update the service plugin to get the env var injected'
			});
			await this.fetchFromSecret();
			return;
		}

		await this.fetchFromParameterStore();
	}

	/**
	 * @private
	 */
	static async fetchFromParameterStore() {

		const client = new SSMClient();

		try {
			const { Parameter } = await client.send(new GetParameterCommand({ Name: this.parameterArn }));
			this.secretValue = (Parameter && Parameter.Value && JSON.parse(Parameter.Value)) || false;
		} catch(err) {
			logger.error('Failed to fetch accountsIdsByService from Parameter Store', { error: err.message });
			this.secretValue = false;
		}

		if(this.secretValue === false)
			throw new LambdaError('Secret is missing', LambdaError.codes.JANIS_SECRET_MISSING);
	}

	/**
	 * @private
	 */
	static async fetchFromSecret() {

		try {
			const secretHandler = AwsSecretsManager.secret(this.secretName);
			this.secretValue = await secretHandler.getValue();
			this.secretValue = this.secretValue || false;
		} catch(err) {
			logger.error('Failed to fetch AccountsIdsByService from Secrets Manager', { error: err.message });
			this.secretValue = false;
		}

		if(this.secretValue === false)
			throw new LambdaError('Secret is missing', LambdaError.codes.JANIS_SECRET_MISSING);
	}
};
