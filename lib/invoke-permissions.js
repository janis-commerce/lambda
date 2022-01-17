'use strict';

const permissions = [
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
	]
];

module.exports = permissions;
