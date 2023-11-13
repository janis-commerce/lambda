'use strict';

const RouterFetcher = require('@janiscommerce/router-fetcher');

/**
 * Get the local port of the service
 * @param {string} serviceCode JANIS service code
 * @returns {string}
 */
module.exports = async serviceCode => {

	const routerFetcher = new RouterFetcher();
	const { servers } = await routerFetcher.getSchema(serviceCode);

	if(!servers)
		return;

	for(const server of servers) {
		if(server.variables?.environment?.default === 'local')
			return server.url.match(/(?<=:).+?(?=\/)/g)[1];
	}
};
