var _ 						=	require('lodash');
var extend  			= _.extend;
var forEach				= _.forEach;
var isString				= _.isString;
var inherits 			= require('../utils/inherits');
var isFunction			= _.isFunction;
var QueryBuilder		= require('sqlbuilder').QueryBuilder;

function Builder(query) {
	if(!(query instanceof QueryBuilder)) {
		throw new Error('query must be an instance of QueryBuilder')
	}

	this.query = query;
}

extend(Builder.prototype, {
	eagerLoad: [],

	getModel: function () {
		return this.model;
	},

	setModel: function (model) {
		this.model = model;

		this.query.from(model.getTable());

		return this;
	},

	with: function (relations) {
		if(isString(relations)) {
			relations = toArray(arguments);
		}

		var eagers = this.parseRelations(relations);

		this.eagerLoad = this.eagerLoad.concat(eagers);

		return this;
	},

	eagerLoadRelations: function (models) {
		forEach(models, function (model) {
			console.log(model.get())
		})
		forEach(this.eagerLoad, function (constraints, name) {
			// For nested eager loads we'll skip loading them here and they will be set as an
      // eager load on the query to retrieve the relation so that they will be eager
      // loaded on that query, because that is where they get hydrated as models.
      if(name.indexOf('.') === -1) {
      	models = this.loadRelation(models, name, constraints);
      }
		}, this);

		return models;
	},

	parseRelations: function (relations) {
		var results = [];

		forEach(relations, function (constraints, name) {
			// If the "relation" value is actually a numeric key, we can assume that no
      // constraints have been specified for the eager load and we'll just put
      // an empty Closure with the loader so that we can treat all the same.
      if(isNumber(name)) {
      	var f = function () {};

      	name = contraints;
      	contraints = f;
      }

      // We need to separate out any nested includes. Which allows the developers
      // to load deep relationships using "dots" without stating each level of
      // the relationship with its own key in the array of eager load names.
      results = this.parseNested(name, results);

      results[name] = contraints;
		}, this);

		return results;
	},

	parseNested: function (name, results) {
		var progress = [];

		// If the relation has already been set on the result array, we will not set it
    // again, since that would override any constraints that were already placed
    // on the relationships. We will only set the ones that are not specified.
    forEach(name.split('.'), function (segment) {
    	progress.push(segment);

    	var last = progress.join('.');

    	if(!results[last]) {
    		results[last] = function () {};
    	}
    });

    return results;
	},

	get: function (columns) {
		columns = columns || ['*'];

		var models = this.getModels(columns);

		// If we actually found models we will also eager load any relationships that
    // have been specified as needing to be eager loaded, which will solve the
    // n+1 query issue for the developers to avoid running a lot of queries.
    if(models.length > 0) {
    	models = this.eagerLoadRelations(models);
    }

    return this.model.newCollection(models);
	},

	where: function (column, operator, value, boolean) {
		if(isFunction(column)) {
			var query = this.model.newQueryWithoutScopes();

			column(query);

			this.query.addNestedWhereQuery(query.getQuery(), boolean);
		} else {
			this.query.where.apply(this.query, arguments);
		}

		return this;
	},

	whereNotNull: function () {
		this.query.whereNotNull.apply(this.query, arguments);

		return this;
	},

	take: function () {
		return this.query.take.apply(this.query, arguments);
	},

	first: function (columns) {
		columns = columns || ['*'];

		return this.take(1).get(columns).then(function (data) {
			return data.rows;
		});
	},

	getModels: function (columns) {
		columns = columns || ['*'];

		var results = this.query.get(columns);
		var connection = this.model.getConnectionName();

		return this.model.hydrate(results, connection);
	},

	join: function () {
		this.query.join.apply(this.query, arguments);

		return this;
	},

	getQuery: function () {
		return this.query;
	},

	addSelect: function () {
		if(!this.query.columns) {
			this.query.columns = [];
		}

		this.query.addSelect.apply(this.query, arguments);

		return this;
	}
});

module.exports = Builder;