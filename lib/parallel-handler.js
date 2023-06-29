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

			if (session && !preparedEvent.session)
				preparedEvent.session = session;

			if (stateMachine && !preparedEvent.stateMachine)
				preparedEvent.stateMachine = stateMachine;

			preparedEvent.body.push(body);

			return preparedEvent;
		}, {
			body: []
		});
	}

	static getFullData(body) {

		return Promise.all(body.map(async (item, index) => {

			if(!item?.contentS3Path)
				return item;

			const s3Body = await Lambda.getBodyFromS3(item.contentS3Path);

			if(!item?.error)
				return s3Body;

			return {
				...s3Body,
				error: item.error
			};
		}));
	}
};
