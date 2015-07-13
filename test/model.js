var _     = require('lodash');
var first = _.first;
var faker = require('Faker');

var assert = require('assert');

var MockConnection = require('sqlbuilder/helpers/mock-connection');

var MySqlGrammar = require('sqlbuilder/src/grammars/mysql-grammar');
var QueryBuilder = require('sqlbuilder/src/querybuilder');

var builder = new QueryBuilder(new MockConnection(), new MySqlGrammar());
var mockConnection = builder.connection;

var expressive = require('../src/expressive')(builder);

describe('Model', function () {
  var User, users = [];

  beforeEach(function () {
    for(var i=0; i<10; i++) {
      users.push(faker.Helpers.userCard());
    }

    User = expressive.Model.extend({
      table: 'users'
    });
  });

  describe('constructor', function () {
  	it('should list items on a model', function (done) {
      mockConnection.expectQuery('select * from `users` where `id` = "1"').respond(first(users));
      mockConnection.expectQuery('select * from `users`').respond(users);

      User.find(1).then(function (user) {
      }).then(function () {
        done();
      }, function (err) {
        done(err);
      });
    });

    it('should fill the model with new attributes through the constructor', function () {
      var user = new User(users[0]);

      assert.deepEqual(users[0], user.attributes);
    });

    it('should have a primary key defined in the prototype', function () {
      assert.equal('id', expressive.Model.prototype.primaryKey);
    });
  });
});