'use strict';

const assert = require('assert');
const { ApiSession } = require('@janiscommerce/api-session');

const { ParallelHandler } = require('../lib/index');

describe('ParallelHandler', () => {

	const session = { clientCode: 'defaultClient' };

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
				{ body: body1, session },
				{ body: body2, session }
			];

			const apiSession = new ApiSession({ ...session });

			class LambdaFunctionExample {

				process() {
					return {
						session: this.session,
						data: this.data
					};
				}
			}

			assert.deepStrictEqual(await ParallelHandler.handle(LambdaFunctionExample, event), {
				session: apiSession,
				data: [body1, body2]
			});
		});
	});
});
