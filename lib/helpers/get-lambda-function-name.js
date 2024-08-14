'use strict';

const startcase = require('lodash.startcase');

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

	return result.substring(0, 1).toUpperCase() + result.substring(1).replace(/-/g, '');
};

/**
 * Get the JANIS Lambda function name
 * @param {string} functionName In TitleCase or dash-case
 * @returns {string}
 */
module.exports = (functionName, serviceAccountId, serviceName = process.env.JANIS_SERVICE_NAME) => {

	if(!serviceName)
		throw new LambdaError('No Service Name was found', LambdaError.codes.NO_SERVICE);

	const serviceTitle = startcase(serviceName).replace(/ /g, '');
	const fullServiceTitle = `Janis${serviceTitle}Service`;

	const env = process.env.JANIS_ENV;

	const lambdaFunctionName = dashCaseToTitleCase(functionName);

	const formattedFunctionName = `${fullServiceTitle}-${env}-${lambdaFunctionName}`;

	if(!serviceAccountId)
		return formattedFunctionName;

	return `${serviceAccountId}:function:${formattedFunctionName}`;
};
