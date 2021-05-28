'use strict';

const assert = require('assert');
const { Lambda } = require('../../lib');

describe('Lambda bases', () => {

	describe('Lambda', () => {

		it('Should have working getter and setter for session', () => {

			const fakeSession = { clientCode: 'some-client' };

			const lambda = new Lambda();

			lambda.session = fakeSession;

			assert.deepStrictEqual(lambda.session, fakeSession);
		});

	});

});
