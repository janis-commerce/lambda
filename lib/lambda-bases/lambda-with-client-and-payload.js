'use strict';

const Lambda = require('./lambda');

module.exports = class LambdaWithClientAndPayload extends Lambda {

	get mustHaveClient() {
		return true;
	}

	get mustHavePayload() {
		return true;
	}

};
