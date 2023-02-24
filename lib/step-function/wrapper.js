'use strict';

const { SFNClient, StartExecutionCommand, StopExecutionCommand, ListExecutionsCommand } = require('@aws-sdk/client-sfn');

const stepFunctions = new SFNClient();

module.exports = {
	SFNClient: stepFunctions,
	startExecution: params => stepFunctions.send(new StartExecutionCommand(params)),
	stopExecution: params => stepFunctions.send(new StopExecutionCommand(params)),
	listExecutions: params => stepFunctions.send(new ListExecutionsCommand(params))
};
