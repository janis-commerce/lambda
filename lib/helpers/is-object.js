'use strict';

const isObject = object => object && !Array.isArray(object) && typeof object === 'object';

module.exports = {
	isObject,
	isObjectNotEmpty: object => isObject(object) && Object.keys(object).length
};
