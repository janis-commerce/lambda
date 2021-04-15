'use strict';

const Handler = require('./handler');

module.exports = class ParallelHandler extends Handler {

	static prepareEvent(event) {
		return event.reduce((preparedEvent, { body, session }) => {

			if(session && !preparedEvent.session)
				preparedEvent.session = session;

			preparedEvent.body.push(body);

			return preparedEvent;
		}, {
			body: []
		});
	}
};
