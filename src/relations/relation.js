var _									= require('lodash');
var map								= _.map;
var uniq								= _.uniq;
var values							= _.values;
var extend						= _.extend;
var inherits 					= require('../utils/inherits');
var Expression					= require('sqlbuilder/src/expression');
var EventEmitter 			= require('events');

inherits(Relation, EventEmitter);

function Relation (query, parent) {
	EventEmitter.call(this);

	this.query = query;
	this.parent = parent;
	this.related = query.getModel();
	this.addConstraints();
}

extend(Relation.prototype, {
	constraints: true,

	getEager: function () {
		return this.get();
	},

	touch: function () {
		var column = this.getRelated().getUpdatedAtColumn();

		this.rawUpdate({ column: this.getRelated().freshTimestampString() });
	},

	rawUpdate: function (attributes) {
		return this.query.update(attributes);
	},

	getRelationCountQuery: function (query, parent) {
		query.select(new Expression('count(*)'));

		var key = this.wrap(this.getQualifiedParentKeyName());

		return query.where(this.getHasCompareKey(), '=', new Expression(key));
	},

	getKeys: function (models, key) {
		return uniq(values(map(models, function (value) {
			return key ? value.getAttribute(key) : value.getKey(key);
		})));
	},

	getQuery: function () {
		return this.query;
	},

	getBaseQuery: function () {
		return this.query.baseQuery;
	},

	getParent: function () {
		return this.parent;
	},

	getQualifiedParentKeyName: function () {
		return this.parent.getQualifiedKeyName();
	},

	getRelated: function () {
		return this.related;
	},

	createdAt: function () {
		return this.parent.getCreatedAtColumn();
	},

	updatedAt: function () {
		return this.parent.getUpdatedAtColumn();
	},

	relatedUpdatedAt: function () {
		return this.related.getUpdatedAtColumn();
	},

	wrap: function (value) {
		return this.parent.newQueryWithoutScopes().getQuery().getGrammar().wrap(value);
	},

	addConstraints: function () {}
});

// Methods extended from QueryBuilder 
extend(Relation.prototype, {
	get: function () {
		return this.query.get();
	},

	where: function () {
		return this.query.where.apply(this.query, arguments);
	},

	first: function () {
		return this.query.first.apply(this.query, arguments);
	}
});

module.exports = Relation;