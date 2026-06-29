'use strict';

// Without this JSDoc type definition, TS breaks the package type definition for packages depending on this
/** @type {Array<>} */
module.exports = [
	[
		'iamStatement',
		{
			action: ['lambda:InvokeFunction'],
			resource: '*'
		}
	],
	[
		'iamStatement',
		{
			action: 'Sts:AssumeRole',
			resource: 'arn:aws:iam::*:role/LambdaRemoteInvoke'
		}
	],
	[
		'iamStatement',
		{
			action: 'ssm:GetParameter',
			resource: 'arn:aws:ssm:*:*:parameter/accountsIdsByService'
		}
	]
];
