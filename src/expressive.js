var _ 			= require('lodash');
var extend	= _.extend;

var Model = require('./model');
var Builder = require('sqlbuilder').QueryBuilder;

function Expressive(builder) {
	this.connection = builder.connection;
	this.builder = builder;

	this.Model = Model.extend({
		grammar: builder.grammar,
		connection: builder.connection
	});
}

module.exports = function (builder) {
	var expressive = new Expressive(builder);

	return expressive;
};