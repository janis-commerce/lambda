'use strict';

const logger = require('lllog')();

const { STS, Lambda } = require('./aws-wrappers');

const LambdaError = require('../lambda-error');

module.exports = class LambdaInstance {

	/**
	 * @private
	 * @static
	 */
	static get roleName() {
		return 'JanisRemoteInvoke';
	}

	/**
	 * @private
	 * @static
	 */
	static get roleSessionName() {
		return process.env.JANIS_SERVICE_NAME;
	}

	/**
	 * @private
	 * @static
	 */
	static get roleSessionDuration() {
		return 1800; // 30 minutes
	}

	/**
	 * @private
	 * @static
	 */
	static get sts() {

		if(!this._sts)
			this._sts = new STS();

		return this._sts;
	}

	/**
	 * @private
	 * @static
	 */
	static getInstance() {

		if(!this._basicInstance)
			this._basicInstance = new Lambda();

		return this._basicInstance;
	}

	/**
	 * @private
	 * @static
	 * @param {string} accountId JANIS Service Account ID
	 * @returns {Lambda} Lambda instance with role credentials
	 */
	static async getInstanceWithRole(accountId) {

		const cachedInstance = this.getCachedInstance(accountId);

		if(cachedInstance)
			return cachedInstance;

		const credentials = await this.getCredentials(accountId);
		const lambdaInstance = new Lambda({ credentials });

		this.setCacheInstance(accountId, credentials, lambdaInstance);

		return lambdaInstance;
	}

	/**
	 * @private
	 * @static
	 * @param {string} accountId JANIS Service Account ID
	 * @returns {object} AWS Role credentials
	 */
	static async getCredentials(accountId) {

		const roleArn = `arn:aws:iam::${accountId}:role/${this.roleName}`;

		let assumedRole;

		try {

			assumedRole = await this.sts.assumeRole({
				RoleArn: roleArn,
				RoleSessionName: this.roleSessionName,
				DurationSeconds: this.roleSessionDuration
			});

		} catch(err) {
			logger.warn(`Error while trying to assume role ${roleArn}: ${err.message}`);
			assumedRole = false;
		}

		if(!assumedRole)
			throw new LambdaError('Could not assume role for external service Lambda invocation', LambdaError.codes.ASSUME_ROLE_ERROR);

		const { Credentials, Expiration } = assumedRole;

		return {
			accessKeyId: Credentials.AccessKeyId,
			secretAccessKey: Credentials.SecretAccessKey,
			sessionToken: Credentials.SessionToken,
			expiration: Expiration
		};
	}

	/**
	 * @private
	 * @static
	 * @param {string} accountId JANIS Service Account ID
	 * @returns {Lambda} Lambda instance with role credentials
	 */
	static getCachedInstance(accountId) {

		if(!this.cachedInstances || !this.cachedInstances[accountId])
			return;

		const { credentials, lambdaInstance } = this.cachedInstances[accountId];

		return this.validateCredentials(credentials) && lambdaInstance;
	}

	/**
	 * @private
	 * @static
	 * @param {string} accountId JANIS Service Account ID
	 * @param {object} credentials AWS Role credentials
	 * @param {Lambda} lambdaInstance Lambda instance with role credentials
	*/
	static setCacheInstance(accountId, credentials, lambdaInstance) {

		if(!this.cachedInstances)
			this.cachedInstances = {};

		this.cachedInstances[accountId] = { credentials, lambdaInstance };
	}

	/**
	 * @private
	 * @static
	 * @param {object} credentials AWS Role credentials
	 * @returns {boolean} true if credentials aren't expired, false otherwise
	 */
	static validateCredentials(credentials) {
		return credentials && new Date(credentials.expiration) > new Date();
	}
};
