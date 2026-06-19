'use strict';

const sinon = require('sinon');
const assert = require('assert');

const { LambdaWrapper } = require('../../lib/helpers/aws-wrappers');

describe('Helpers', () => {

	describe('Lambda Wrapper', () => {

		afterEach(() => sinon.restore());

		describe('invoke()', () => {

			const invokeParams = { FunctionName: 'Test', InvocationType: 'RequestResponse' };

			it('Should return the Payload as a string when the invocation responds with one', async () => {

				const wrapper = new LambdaWrapper();

				// eslint-disable-next-line no-underscore-dangle
				sinon.stub(wrapper._lambda, 'send').resolves({
					StatusCode: 200,
					Payload: Buffer.from(JSON.stringify({ ok: true }))
				});

				const response = await wrapper.invoke(invokeParams);

				assert.deepStrictEqual(response, {
					StatusCode: 200,
					Payload: JSON.stringify({ ok: true })
				});
			});

			it('Should not throw and return an undefined Payload when the invocation responds without one (Event)', async () => {

				const wrapper = new LambdaWrapper();

				// eslint-disable-next-line no-underscore-dangle
				sinon.stub(wrapper._lambda, 'send').resolves({
					StatusCode: 202,
					Payload: null
				});

				const response = await wrapper.invoke({ ...invokeParams, InvocationType: 'Event' });

				assert.deepStrictEqual(response, {
					StatusCode: 202,
					Payload: undefined
				});
			});
		});
	});
});
