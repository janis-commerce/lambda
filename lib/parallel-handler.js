'use strict';

const Handler = require('./handler');

module.exports = class ParallelHandler extends Handler {

	/**
	 * @static
	 * @param {Array<import('./handler').AWSLambdaEvent>} event
	 * @returns {import('./handler').AWSLambdaEvent}
	 */
	static prepareEvent(event) {
		return event.reduce((preparedEvent, { body, session, stateMachine, state }) => {

			if(session && !preparedEvent.session)
				preparedEvent.session = session;

			if(stateMachine && !preparedEvent.stateMachine)
				preparedEvent.stateMachine = stateMachine;

			if(state && !preparedEvent.state)
				preparedEvent.state = state;

			preparedEvent.body.push(body);

			return preparedEvent;
		}, {
			body: []
		});
	}

	static getFullData(body) {
		return Promise.all(body.map(super.getFullData));
	}
};
