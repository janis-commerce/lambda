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

};
