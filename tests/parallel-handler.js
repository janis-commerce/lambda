/* eslint-disable max-classes-per-file */

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const { ApiSession } = require('@janiscommerce/api-session');

const { ParallelHandler, Lambda } = require('../lib/index');

describe('ParallelHandler', () => {

	const session = { clientCode: 'defaultClient' };

	const stateMachine = {
		Id: 'id-state-machine',
		Name: 'state-machine-test'
	};

	const state = {
		EnteredTime: '2019-03-26T20:14:13.192Z',
		Name: 'Test',
		RetryCount: 3
	};

	context('When valid Args is passed', () => {

		it('Should set correct session and data', async () => {

			const body1 = {
				name: 'Some-Name',
				age: 30,
				pets: ['Cats', 'Birds']
			};

			const body2 = {
				name: 'Other-Name',
				age: 25,
				pets: ['Dogs', 'Frogs']
			};

			const event = [
				{ body: body1, session, stateMachine, state },
				{ body: body2, session, stateMachine, state }
			];

			const apiSession = new ApiSession({ ...session });

			class LambdaFunctionExample {

				process() {
					return {
						session: this.session,
						body: this.data
					};
				}
			}

			assert.deepStrictEqual(await ParallelHandler.handle(LambdaFunctionExample, event), {
				session: apiSession,
				body: [body1, body2],
				stateMachine,
				state
			});
		});

		it('Should complete the bodies from s3', async () => {

			const body1 = {
				name: 'Some-Name',
				age: 30,
				pets: ['Cats', 'Birds']
			};

			const body2 = {
				name: 'Other-Name',
				age: 25,
				pets: ['Dogs', 'Frogs']
			};

			const body3 = {
				name: 'Long Body 1',
				example: 'Imagine that this body weighs more than 250KB',
				error: { Error: 'Lambda.Unknown' }
			};

			const body4 = {
				name: 'Long Body 2',
				example: 'Imagine that this body weighs more than 250KB'
			};

			const bodyLong1 = {
				contentS3Path: 'step-function-payloads/2023/01/01/bodyLong1.json',
				error: { Error: 'Lambda.Unknown' }
			};

			const bodyLong2 = {
				contentS3Path: 'step-function-payloads/2023/01/01/bodyLong2.json'
			};

			const LambdaStub = sinon.stub(Lambda, 'getBodyFromS3');

			LambdaStub
				.withArgs(bodyLong1.contentS3Path)
				.resolves(body3);

			LambdaStub
				.withArgs(bodyLong2.contentS3Path)
				.resolves(body4);

			const event = [
				{ body: body1, session, stateMachine, state },
				{ body: body2, session, stateMachine, state },
				{ body: bodyLong1, session, stateMachine, state },
				{ body: bodyLong2, session, stateMachine, state }
			];

			const apiSession = new ApiSession({ ...session });

			class LambdaFunctionExample {

				process() {

					return {
						session: this.session,
						body: this.data
					};
				}
			}

			assert.deepStrictEqual(await ParallelHandler.handle(LambdaFunctionExample, event), {
				session: apiSession,
				body: [body1, body2, body3, body4],
				stateMachine,
				state
			});
		});
	});
});
