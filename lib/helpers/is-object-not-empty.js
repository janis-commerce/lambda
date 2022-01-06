'use strict';

module.exports = object => !Array.isArray(object) && typeof object === 'object' && Object.keys(object).length;