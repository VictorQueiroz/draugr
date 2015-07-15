var _ 						= require('lodash'),
		md5						= require('../utils/md5'),
		extend				= _.extend,
		inherits				= require('../utils/inherits'),
		microtime 			= require('../utils/microtime'),
		Expression			= require('sqlbuilder/src/expression'),
		Relation				= require('./relation');

inherits(HasManyThrough, Relation);

function HasManyThrough(query, farParent, parent, firstKey, secondKey, localKey) {
	this.localKey = localKey;
	this.firstKey = firstKey;
	this.secondKey = secondKey;
	this.farParent = farParent;

  Relation.call(this, query, parent);
}

extend(HasManyThrough.prototype, {
	/**
   * Set the base constraints on the relation query.
   */
	addConstraints: function () {
		var localValue = this.farParent.getAttribute(this.localKey);
		var parentTable = this.parent.getTable();

		this.setJoin();

		if(this.constraints) {
			this.query.where(`${parentTable}.${this.firstKey}`, '=', localValue);
		}
	},

	/**
   * Add the constraints for a relationship count query.
   */
  getRelationCountQuery: function (query, builder) {
  	var parentTable = this.parent.table();

  	this.setJoin(query);

  	query.select(new Expression('count(*)'));

  	var key = this.wrap(`${parentTable}.${this.firstKey}`);

  	return query.where(this.getHasCompareKey(), '=', new Expression(key));
  },

  /**
   * Set the join clause on the query.
   */
  setJoin: function (query) {
  	query = query || this.query;

  	var foreignKey = `${this.related.getTable()}.${this.secondKey}`;

  	query.join(this.parent.getTable(), this.getQualifiedParentKeyName(), '=', foreignKey);

  	if(this.parentSoftDeletes()) {
  		query.whereNull(this.parent.getQualifiedDeletedAtColumn());
  	}
  },

  // fixme
  parentSoftDeletes: function () {
  	return false;
  },

  addEagerConstraints: function (models) {
  	var table = this.parent.getTable();

  	this.query.whereIn(`${table}.${this.firstKey}`, this.getKeys(models));
  },

  initRelation: function (models, relation) {
  	forEach(models, function (model) {
  		model.setRelation(relation, this.related.newCollection());
  	}, this);

  	return models;
  },

  match: function (models, results, relation) {
  	var dictionary = this.buildDictionary(results);

  	// Once we have the dictionary we can simply spin through the parent models to
    // link them up with their children using the keyed dictionary to make the
    // matching very convenient and easy work. Then we'll just return them.
    forEach(models, function (model) {
    	var key = model.getKey();

    	if(dictionary[key]) {
    		var value = this.related.newCollection(dictionary[key]);

    		model.setRelation(relation, value);
    	}
    });

    return models;
  },

  /**
   * Build model dictionary keyed by the relation's foreign key.
   */
  buildDictionary: function (results) {
  	var dictionary = [];

  	var foreign = this.firstKey;

  	// First we will create a dictionary of models keyed by the foreign key of the
    // relationship as this will allow us to quickly access all of the related
    // models without having to do nested looping which will be quite slow.
    forEach(results, function (result) {
    	dictionary[result[foreign]].push(result);
    });

    return dictionary;
  },

  /**
   * Get the results of the relationship.
   */
  getResults: function () {
  	return this.get();
  },

  find: function (id, columns) {
  	columns = columns || ['*'];

  	if(isArray(id)) {
  		return this.findMany(id, columns);
  	}

  	this.where(this.getRelated().getQualifiedKeyName(), '=', id);

  	return this.first(columns);
  },

  findMany: function (id, columns) {
  	columns = columns || ['*'];

  	if(isEmpty(ids)) {
  		return this.getRleated().newCollection();
  	}

  	this.whereIn(this.getRelated().getQualifiedKeyName(), ids);

  	return this.get(columns);
  },

  get: function (columns) {
  	columns = columns || ['*'];

  	// First we'll add the proper select columns onto the query so it is run with
    // the proper columns. Then, we will get the results and hydrate out pivot
    // models with the result of those columns as a separate model relation.
    columns = this.query.getQuery().columns ? [] : columns;

    var select = this.getSelectColumns(columns);

    var models = this.query.addSelect(select).getModels();

    // If we actually found models we will also eager load any relationships that
    // have been specified as needing to be eager loaded. This will solve the
    // n + 1 query problem for the developer and also increase performance.
    if(models.length > 0) {
    	models = this.query.eagerLoadRelations(models);
    }

    return this.related.newCollection(models);
  },

  getSelectColumns: function (columns) {
  	columns = columns || ['*'];

  	if(columns == ['*']) {
  		columns = [`${this.related.getTable()}.*`];
  	}

  	return (columns = columns.concat([`${this.parent.getTable()}.${this.firstKey}`]));
  },

  getHasCompareKey: function () {
  	return this.farParent.getQualifiedKeyName();
  }
});

module.exports = HasManyThrough;