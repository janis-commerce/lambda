'use strict';

const Lambda = require('./lambda');

module.exports = class LambdaWithPayload extends Lambda {

	get mustHavePayload() {
		return true;
	}

};
