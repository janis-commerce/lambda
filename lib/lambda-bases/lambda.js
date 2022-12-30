'use strict';

const s3 = require('@janiscommerce/s3');
const { customAlphabet } = require('nanoid');
const lodashPick = require('lodash.pick');

const NANOID_LENGTH = 10;
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789', NANOID_LENGTH);

module.exports = class Lambda {

	/**
	 * @param {import('@janiscommerce/api-session').ApiSession} session
	 */
	set session(session) {
		/** @private */
		this._session = session;
	}

	/**
	 * @returns {import('@janiscommerce/api-session').ApiSession}
	 */
	get session() {
		return this._session;
	}

	/**
	 * @param {*} data The invocation payload
	 */
	set data(data) {
		/** @private */
		this._data = data;
	}

	/**
	 * @returns {*} The invocation payload
	 */
	get data() {
		return this._data;
	}

	/**
	 * @param {*} taskToken The task token. Only present for async invoked tasks of state machines
	 */
	set taskToken(taskToken) {
		/** @private */
		this._taskToken = taskToken;
	}

	/**
	 * @returns {*} The task token. Only present for async invoked tasks of state machines
	 */
	get taskToken() {
		return this._taskToken;
	}

	/**
	 * @returns {boolean} Whether the invocation must have a client associated or not
	 */
	get mustHaveClient() {
		return false;
	}

	/**
	 * @returns {boolean} Whether the invocation must have a payload or not
	 */
	get mustHavePayload() {
		return false;
	}

	/**
	 * @returns {boolean} Whether the invocation must have a user associated or not
	 */
	get mustHaveUser() {
		return false;
	}

	/**
	 * @returns {object} A struct to validate and/or filter the invocation payload. If defined, struct response will be set to the `data` property
	 */
	get struct() {
		return null;
	}

	/**
	 * @returns {Promise<void>|void} Perform extra validations. It should throw/reject in case of errors
	 */
	async validate() {
		return null;
	}

	/**
	 * @returns {Promise<unknown>} Run your lambda logic here. This method is only invoked if all validations passed.
	 */
	async process() {
		return null;
	}

	static async bodyToS3Path(mainFolder, data, fixedProperties) {

		if(!process.env.S3_BUCKET)
			return data;

		const now = new Date();

		const key = `${mainFolder}/${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}/${nanoid()}.json`;

		await s3.putObject({
			Body: JSON.stringify(data),
			Bucket: process.env.S3_BUCKET,
			Key: key
		});

		return {
			contentS3Path: key,
			...fixedProperties?.length && lodashPick(data, fixedProperties)
		};
	}

	static async getBodyFromS3(bodyS3Key) {

		const { Body } = await s3.getObject({
			Bucket: process.env.S3_BUCKET,
			Key: bodyS3Key
		});

		return JSON.parse(Body.toString());
	}

};
