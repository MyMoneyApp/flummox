var _ = require('underscore');
var flummoxES6 = require('./flummoxes6.js');
var flummox = require('./flummox.js');

var index = {};
index.flummox = flummox;
index.flummoxES6 = flummoxES6;
window.index = index;
module.exports = index;
