'use strict';

const startcase = require('lodash/startcase');

/**
 * Get the JANIS Lambda function name
 * @param {string} functionName In TitleCase or dash-case
 * @param {integer} serviceAccountId The AWS Account ID of the service
 * @returns {string}
 */
module.exports = (functionName, serviceAccountId, serviceName) => {

	const serviceTitle = startcase(serviceName).replace(/ /g, '');

	const env = process.env.JANIS_ENV;

	const formattedFunctionName = `API-${serviceTitle}-${functionName}-${env}`;

	return `${serviceAccountId}:function:${formattedFunctionName}`;
};
