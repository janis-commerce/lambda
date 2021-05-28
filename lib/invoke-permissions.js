'use strict';

const permissions = [
	[
		'iamStatement',
		{
			action: ['lambda:InvokeFunction'],
			resource: '*'
		}
	]
];

module.exports = permissions;
