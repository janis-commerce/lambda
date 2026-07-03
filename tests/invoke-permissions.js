'use strict';

const assert = require('assert');

const { accountsIdsPermissions } = require('@janiscommerce/accounts-ids-by-service');

const invokePermissions = require('../lib/invoke-permissions');

describe('invokePermissions', () => {

	it('Should include the lambda invoke and assume role statements', () => {

		assert.deepStrictEqual(invokePermissions[0], [
			'iamStatement',
			{
				action: ['lambda:InvokeFunction'],
				resource: '*'
			}
		]);

		assert.deepStrictEqual(invokePermissions[1], [
			'iamStatement',
			{
				action: 'Sts:AssumeRole',
				resource: 'arn:aws:iam::*:role/LambdaRemoteInvoke'
			}
		]);
	});

	it('Should spread the accountsIdsPermissions statements from @janiscommerce/accounts-ids-by-service', () => {
		assert.deepStrictEqual(invokePermissions.slice(2), accountsIdsPermissions);
	});
});
