'use strict';

const getLambdaFunctionName = require('./get-lambda-function-name');

const setPayloadEnvVar = (session, body) => {

	if(!session && !body) {
		delete process.env.JANIS_LAMBDA_PAYLOAD;
		return;
	}

	const payload = {
		...session && { session },
		...body && { body }
	};

	process.env.JANIS_LAMBDA_PAYLOAD = JSON.stringify(payload);
};

module.exports = (LambdaFunction, session, body) => {

	setPayloadEnvVar(session, body);

	if(process.env.JANIS_ENV === 'local')
		process.env.AWS_LAMBDA_FUNCTION_NAME = getLambdaFunctionName(LambdaFunction.name);
};
