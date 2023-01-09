'use strict';

const Handler = require('./handler');
const Lambda = require('./lambda-bases/lambda');

module.exports = class ParallelHandler extends Handler {

	/**
	 * @static
	 * @param {Array<import('./handler').AWSLambdaEvent>} event
	 * @returns {import('./handler').AWSLambdaEvent}
	 */
	static prepareEvent(event) {
		return event.reduce((preparedEvent, { body, session, stateMachine }) => {

			if(session && !preparedEvent.session)
				preparedEvent.session = session;

			if(stateMachine && !preparedEvent.stateMachine)
				preparedEvent.stateMachine = stateMachine;

			preparedEvent.body.push(body);

			return preparedEvent;
		}, {
			body: []
		});
	}

	static getFullData(body) {

		return Promise.all(body.map(item => {

			if(!item?.contentS3Path)
				return item;

			return Lambda.getBodyFromS3(item.contentS3Path);
		}));
	}
};
