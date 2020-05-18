'use strict';

const Handler = require('./handler');
const Invoker = require('./invoker');
const LambdaError = require('./lambda-error');
const invokePermissions = require('./invoke-permissions.json');

module.exports = {
	Handler,
	Invoker,
	LambdaError,
	invokePermissions
};
