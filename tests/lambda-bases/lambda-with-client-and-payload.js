'use strict';

const assert = require('assert');
const { LambdaWithClientAndPayload } = require('../../lib');

describe('Lambda bases', () => {

	describe('LambdaWithClientAndPayload', () => {

		it('Should have working getter and setter for session', () => {

			const fakeSession = { clientCode: 'some-client' };

			const lambda = new LambdaWithClientAndPayload();

			lambda.session = fakeSession;

			assert.deepStrictEqual(lambda.session, fakeSession);
		});

		it('Should have validation setters mustHaveClient and mustHavePayload set as true by default', () => {

			const lambda = new LambdaWithClientAndPayload();

			assert.deepStrictEqual(lambda.mustHaveClient, true);
			assert.deepStrictEqual(lambda.mustHavePayload, true);
		});

	});

});
