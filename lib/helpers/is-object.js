'use strict';

const isObject = object => object && !Array.isArray(object) && typeof object === 'object';

const isObjectNotEmpty = object => isObject(object) && Object.keys(object).length;

module.exports = { isObject, isObjectNotEmpty };
