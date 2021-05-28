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

		it('Should have working getter and setter for data', () => {

			const invocationData = { foo: 'bar' };

			const lambda = new Lambda();

			lambda.data = invocationData;

			assert.deepStrictEqual(lambda.data, invocationData);
		});

		it('Should have validation getter mustHaveClient set as false by default', () => {
			const lambda = new Lambda();
			assert.deepStrictEqual(lambda.mustHaveClient, false);
		});

		it('Should have validation getter mustHavePayload set as false by default', () => {
			const lambda = new Lambda();
			assert.deepStrictEqual(lambda.mustHavePayload, false);
		});

		it('Should have validation getter mustHaveUser set as false by default', () => {
			const lambda = new Lambda();
			assert.deepStrictEqual(lambda.mustHaveUser, false);
		});

		it('Should have validation getter struct set as null by default', () => {
			const lambda = new Lambda();
			assert.deepStrictEqual(lambda.struct, null);
		});

		it('Should have validate method resolving by default', () => {
			const lambda = new Lambda();
			assert.doesNotReject(() => lambda.validate());
		});

		it('Should have process method resolving by default', () => {
			const lambda = new Lambda();
			assert.doesNotReject(() => lambda.process());
		});

	});

});
