'use strict';

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
	 * @returns {void} Perform extra validations. It should throw/reject in case of errors
	 */
	async validate() {
		return null;
	}

	/**
	 * @returns {void} Run your lambda logic here. This method is only invoked if all validations passed.
	 */
	async process() {
		return null;
	}

};
