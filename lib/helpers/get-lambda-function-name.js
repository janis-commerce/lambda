'use strict';

const LambdaError = require('../lambda-error');

/**
 * @param {string} string
 * @returns {string}
 */
const dashCaseToTitleCase = string => {

	let result = '';

	for(let index = 0; index < string.length; index++) {

		let character = string[index];

		if(string[index - 1] === '-')
			character = character.toUpperCase();

		result += character;
	}

	return result.substr(0, 1).toUpperCase() + result.substr(1).replace(/-/g, '');
};

/**
 * Get the JANIS Lambda function name
 * @param {string} functionName In TitleCase or dash-case
 * @returns {string}
 */
module.exports = functionName => {

	if(!process.env.JANIS_SERVICE_NAME)
		throw new LambdaError('No Service Name is found', LambdaError.codes.NO_SERVICE);

	const serviceName = dashCaseToTitleCase(`janis-${process.env.JANIS_SERVICE_NAME}-service`);
	const env = process.env.JANIS_ENV;
	const lambdaFunctionName = dashCaseToTitleCase(functionName);

	return `${serviceName}-${env}-${lambdaFunctionName}`;
};
