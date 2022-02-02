'use strict';

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
	]
];
