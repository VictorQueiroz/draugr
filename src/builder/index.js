var _ 				=	require('lodash');
var extend  	= _.extend;
var inherits 	= require('../utils/inherits');
var QueryBuilder = require('sqlbuilder').QueryBuilder;

function Builder() {
	QueryBuilder.apply(this, arguments);
}

inherits(Builder, QueryBuilder);

extend(Builder.prototype, {
	getModel: function () {
		return this.model;
	},

	get: function (columns) {
		columns = columns || ['*'];

		var models = this.getModels();

		// If we actually found models we will also eager load any relationships that
    // have been specified as needing to be eager loaded, which will solve the
    // n+1 query issue for the developers to avoid running a lot of queries.
    if(models.length > 0) {
    	models = this.eagerLoadRelations(models);
    }

    return this.model.newCollection;
	}
});

module.exports = Builder;