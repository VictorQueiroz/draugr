'use strict';

var _               = require('lodash');
var util            = require('util');
var Builder         = require('./builder');
var extend          = _.extend;
var forEach         = _.forEach;
var isEmpty         = _.isEmpty;
var isFunction      = _.isFunction;
var isDefined       = function (value) { return !(_.isUndefined(value)); };
var EventEmitter    = require('events');

/**
 * Determine if a given string starts with a given substring.
 */
function startsWith (haystack, needles) {
  var has = false;

  forEach(needles, function (needle) {
    if(isEmpty(needle) && haystack.indexOf(needle) == 0) {
      has = true;
    }
  });

  return has;
}

/**
 * Uppercase the first character of each word in a string
 */
function ucwords(str) {
  return (str + '')
    .replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function($1) {
      return $1.toUpperCase();
    });
}

/**
 * Convert a value to studly caps case.
 */
function studly (value) {
  var key = value;

  value = ucwords(value.replace(/[-_]/g, ' '));

  return value.replace(/\ /g, '');
}

function Model() {
  Builder.apply(this, [this.connection, this.grammar]);

  // Call event emitter constructor on this
	EventEmitter.call(this);

	this.emit('initialized');

  // Auto set the table to the table name of this model
  this.from(this.table);

  if(isFunction(this.initialize)) {
    this.initialize.apply(this, arguments);
  }
}

extend(Model.prototype, {
  parent: Builder.prototype,

  initialize: function (attributes) {
    this.fill(attributes);
  }
});

extend(Model.prototype, EventEmitter.prototype, Builder.prototype, {
  table: '',

  /**
   * The primary key for the model.
   */
  primaryKey: 'id',

  /**
   * The number of models to return for pagination.
   */
  perPage: 15,

  /**
   * Indicates if the IDs are auto-incrementing.
   */
  incrementing: true,

  /**
   * Indicates if the model should be timestamped.
   */
  timestamps: true,

  /**
   * The model's attributes.
   */
  attributes: {},

  /**
   * The model attribute's original state.
   */
  original: [],

  /**
   * The loaded relationships for the model.
   */
  relations: [],

  /**
   * The attributes that should be hidden for arrays.
   */
  hidden: [],

  /**
   * The attributes that should be visible in arrays.
   */
  visible: [],

  /**
   * The accessors to append to the model's array form.
   */
  appends: [],

  /**
   * The attributes that are mass assignable.
   */
  fillable: [],

  /**
   * The attributes that aren't mass assignable.
   */
  guarded: ['*'],

  /**
   * The attributes that should be mutated to dates.
   */
  dates: [],

  /**
   * The storage format of the model's date columns.
   */
  dateFormat: '',

  /**
   * The attributes that should be casted to native types.
   */
  casts: [],

  /**
   * The relationships that should be touched on save.
   */
  touches: [],

  /**
   * User exposed observable events.
   */
  observables: [],

  /**
   * The relations to eager load on every query.
   */
  with: [],

  /**
   * The class name to be used in polymorphic relations.
   */
  morphClass: '',

  /**
   * Indicates if the model exists.
   */
  exists: false,

  /**
   * Indicates whether attributes are snake cased on arrays.
   */
  snakeAttributes: true,

  /**
   * The connection resolver instance.
   */
  resolver: '',

  /**
   * The event dispatcher instance.
   */
  dispatcher: '',

  /**
   * The array of booted models.
   */
  booted: [],

  /**
   * The array of global scopes on the model.
   */
  globalScopes: [],

  /**
   * Indicates if all mass assignment is enabled.
   */
  unguarded: false,

  /**
   * The cache of the mutated attributes for each class.
   */
  mutatorCache: [],

  /**
   * The many to many relationship methods.
   */
  manyMethods: ['belongsToMany', 'morphToMany', 'morphedByMany'],

  /**
   * The name of the "created at" column.
   */
  CREATED_AT: 'created_at',

  /**
   * The name of the "updated at" column.
   */
  UPDATED_AT: 'updated_at',
});

extend(Model.prototype, {
	save: function () {
		if(this.exists) {
			this.performUpdate();
		}
	},

	peformUpdate: function () {
		this.emit('updating');
	},

	performInsert: function () {
		this.emit('creating');
	},

  removeTableFromKey: function (key) {
    if(key.indexOf('.') === -1) {
      return key;
    }

    return last(key.split('.'));
  },

  /**
   * Get the attributes that should be converted to dates.
   */
  getDates: function () {
    var defaults = [this.CREATED_AT, this.UPDATED_AT];

    return this.dates = this.dates.concat(defaults);
  },

  isFillable: function (key) {
    // If the key is in the "fillable" array, we can of course assume that it's
    // a fillable attribute. Otherwise, we will check the guarded array when
    // we need to determine if the attribute is black-listed on the model.
    if(this.fillable.indexOf(key) > -1) {
      return true;
    }

    return isEmpty(this.fillable) && !startsWith(key, '_');
  },

  fill: function (attributes) {
    forEach(attributes, function (value, key) {
      key = this.removeTableFromKey(key);

      // The developers may choose to place some attributes in the "fillable"
      // array, which means only those attributes may be set through mass
      // assignment to the model, and all others will just be ignored.
      if(this.isFillable(key)) {
        this.setAttribute(key, value);
      }
    }, this);

    return this;
  },

  /**
   * Determine whether a value is JSON castable for inbound manipulation.
   */
  isJsonCastable: function (key) {
    if(this.hasCast(key)) {
      return (
        ['array', 'json', 'object', 'collection']
          .indexOf(this.getCastType(key)) > -1
      );
    }

    return false;
  },

  hasCast: function (key) {
    return this.casts.hasOwnProperty(key);
  },

  getCastType: function (key) {
    return this.casts[key].trim().toLowerCase();
  },

  /**
   * Set a given attribute on the model.
   */
  setAttribute: function (key, value) {
    // First we will check for the presence of a mutator for the set operation
    // which simply lets the developers tweak the attribute as it is set on
    // the model, such as "json_encoding" an listing of data for storage.
    if(this.hasSetMutator(key)) {
      var method = `set${studly(key)}Attribute`;

      return this[method](value);
    }

    // If an attribute is listed as a "date", we'll convert it from a DateTime
    // instance into a form proper for storage on the database tables using
    // the connection grammar's date format. We will auto set the values.
    else if (isDefined(this.getDates()[key]) && value) {
      value = this.fromDateTime(value);
    }

    if(this.isJsonCastable(key)) {
      value = JSON.stringify(value);
    }

    this.attributes[key] = value;
  },

  /**
   * Determine if a set mutator exists for an attribute.
   */
  hasSetMutator: function (key) {
    return isFunction(this[`set${studly(key)}Attribute`]);
  },

  /**
   * Extend the Builder `get` method,
   * so we can ensure that we will always
   * get only the rows from the SQL query result
   */
  get: function () {
    return this.parent.get.apply(this, arguments).then(function (data) {
      return data.rows;
    });
  },
});

extend(Model, {
  instantiate: function (callback, defineTable) {
    return callback(new this());
  },

  find: function (id) {
    return this.instantiate(function (model) {
      var response = model;

      if(id) {
        response.where(model.primaryKey, id);
      }

      return response.get().then(function (data) {
        return model.fill(data);
      });
    });
  },

  /**
   * Being querying a model with eager loading.
   */
  with: function (relations) {
  },

  extend: require('./utils/extend')
});

module.exports = Model;