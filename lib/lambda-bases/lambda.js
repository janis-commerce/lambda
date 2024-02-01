'use strict';

const s3 = require('@janiscommerce/s3');
const { customAlphabet } = require('nanoid');
const lodashPick = require('lodash/pick');

const NANOID_LENGTH = 10;
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789', NANOID_LENGTH);

/**
 * @typedef {object} StepFunctionContext
 * @property {string} EnteredTime ISO 8601 Date string
 * @property {string} Name The name of the State Machine
 * @property {number} RetryCount The current number of retry attempts of a task
 */

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
	 * @param {string?} [] The task token. Only present for async invoked tasks of state machines
	 */
	set taskToken(taskToken) {
		/** @private */
		this._taskToken = taskToken;
	}

	/**
	 * @returns {string?} The task token. Only present for async invoked tasks of state machines
	 */
	get taskToken() {
		return this._taskToken;
	}

	/**
	 * @param {StepFunctionContext?} state The invocation state. Only present for async invoked tasks of state machines
	 */
	set state(state) {
		/** @private */
		this._state = state;
	}

	/**
	 *  @returns {StepFunctionContext?} The invocation state. Only present for async invoked tasks of state machines
	*/
	get state() {
		return this._state;
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

		const key = [
			mainFolder,
			now.getFullYear(),
			String(now.getMonth() + 1).padStart(2, '0'),
			String(now.getDate()).padStart(2, '0'),
			`${nanoid()}.json`
		].join('/');

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
