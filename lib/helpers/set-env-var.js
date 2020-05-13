'use strict';

const getLambdaFunctionName = require('./get-lambda-function-name');

const setPayloadEnvVar = (clientCode, body) => {

	if(!clientCode && !body) {
		delete process.env.JANIS_LAMBDA_PAYLOAD;
		return;
	}

	const payload = {
		...clientCode && { __clientCode: clientCode },
		...body && { body }
	};

	process.env.JANIS_LAMBDA_PAYLOAD = JSON.stringify(payload);
};

module.exports = (LambdaFunction, clientCode, body) => {

	setPayloadEnvVar(clientCode, body);

	if(process.env.JANIS_ENV === 'local')
		process.env.AWS_LAMBDA_FUNCTION_NAME = getLambdaFunctionName(LambdaFunction.name);
};
