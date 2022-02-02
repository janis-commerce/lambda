'use strict';

const assert = require('assert');
const { LambdaWithPayload } = require('../../lib');

describe('Lambda bases', () => {

	describe('LambdaWithPayload', () => {

		it('Should have working getter and setter for session', () => {

			const fakeSession = { clientCode: 'some-client' };

			const lambda = new LambdaWithPayload();

			lambda.session = fakeSession;

			assert.deepStrictEqual(lambda.session, fakeSession);
		});

		it('Should have working getter and setter for data', () => {

			const invocationData = { foo: 'bar' };

			const lambda = new LambdaWithPayload();

			lambda.data = invocationData;

			assert.deepStrictEqual(lambda.data, invocationData);
		});

		it('Should have working getter and setter for taskToken', () => {

			const invocationData = 'some-token';

			const lambda = new LambdaWithPayload();

			lambda.taskToken = invocationData;

			assert.deepStrictEqual(lambda.taskToken, invocationData);
		});

		it('Should have validation getter mustHaveClient set as false by default', () => {
			const lambda = new LambdaWithPayload();
			assert.deepStrictEqual(lambda.mustHaveClient, false);
		});

		it('Should have validation getter mustHavePayload set as true by default', () => {
			const lambda = new LambdaWithPayload();
			assert.deepStrictEqual(lambda.mustHavePayload, true);
		});

		it('Should have validation getter mustHaveUser set as false by default', () => {
			const lambda = new LambdaWithPayload();
			assert.deepStrictEqual(lambda.mustHaveUser, false);
		});

		it('Should have validation getter struct set as null by default', () => {
			const lambda = new LambdaWithPayload();
			assert.deepStrictEqual(lambda.struct, null);
		});

		it('Should have validate method resolving by default', () => {
			const lambda = new LambdaWithPayload();
			assert.doesNotReject(() => lambda.validate());
		});

		it('Should have process method resolving by default', () => {
			const lambda = new LambdaWithPayload();
			assert.doesNotReject(() => lambda.process());
		});

	});

});
