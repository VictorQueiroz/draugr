var _       = require('lodash');
var first   = _.first;
var faker   = require('Faker');
var extend  = _.extend;
var assert  = require('assert');

var MockConnection = require('sqlbuilder/helpers/mock-connection');

var MySqlGrammar = require('sqlbuilder/src/grammars/mysql-grammar');
var QueryBuilder = require('sqlbuilder/src/querybuilder');

var builder = new QueryBuilder(new MockConnection(), new MySqlGrammar());
var mockConnection = builder.connection;

var expressive = require('../src/expressive')(builder);

describe('Model', function () {
  var User,       Post,       Country,
      users = [], posts = [];

  beforeEach(function () {
    for(var i=0; i<10; i++) {
      posts.push({
        id: Math.pow(i + 2, 3),
        user_id: i + 1,
        body: faker.Lorem.sentences(3)
      });

      var u = faker.Helpers.userCard();
      u.id = i + 1;
      users.push(u);
    }

    var Phone = expressive.Model.extend({
      table: 'phones',
      name: 'Phone'
    });

    Post = expressive.Model.extend({
      name: 'Post',
      table: 'posts'
    });

    User = expressive.Model.extend({
      name: 'User',
      table: 'users',
      phone: function () {
        return this.hasOne(Phone);
      },
      posts: function () {
        return this.hasMany(Post);
      }
    });

    Country = expressive.Model.extend({
      table: 'countries',
      name: 'Country',
      posts: function () {
        return this.hasManyThrough(Post, User);
      }
    });
  });

  describe('relations', function () {
    it('should define a one-to-one relationship', function (done) {
      mockConnection.expectQuery('select * from `phones` where `phones`.`user_id` = "1" `phones`.`user_id` is not null limit 1').respond({
        id: 1,
        phoneNumber: '4321565489'
      });

      var user = new User(users[0]);

      user.phone().first().then(function (r) {
        assert.equal(1, r.id);
        assert.equal('4321565489', r.phoneNumber);
        done();
      });
    });

    it('should define a one-to-many relationship', function (done) {
      mockConnection.expectQuery('select * from `posts` where `posts`.`user_id` = "2" `posts`.`user_id` is not null').respond(posts);
      mockConnection.expectQuery('select * from `posts` where `posts`.`user_id` = "2" `posts`.`user_id` is not null limit 1').respond(posts[3]);

      var user = new User(users[1]);

      user.posts().get().then(function (posts) {
        assert.equal(20, posts.length);
        assert.equal(8, first(posts).id);

        return user.posts().first();
      }).then(function (post) {
        assert.deepEqual(posts[3], post);
        done();
      }, function (err) {
        done(err);
      });
    });

    it('should define a has-many-through relationship', function (done) {
      mockConnection.expectQuery('select *, `users`.`country_id` from `posts` inner join `users` on `users`.`id` = `posts`.`country_id` where `users`.`country_id` = "2"').respond(posts);

      var country = new Country({
        name: 'USA',
        id: 2
      });

      country.posts().get().then(function (posts) {
        assert.equal(30, posts.length);
        done();
      });
    });
  });

  describe('instance', function () {
    it('should fill the model with new attributes through the constructor', function () {
      var user = new User(first(users));

      assert.deepEqual(first(users), user.attributes);
    });

    it('should have a primary key defined in the prototype', function () {
      assert.equal('id', expressive.Model.prototype.primaryKey);
    });
  });

  describe('constructor', function () {
  	it('should find a resource', function (done) {
      mockConnection.expectQuery('select * from `users` where `id` = "1" limit 1').respond(first(users));

      User.find(1).then(function (user) {
        assert.deepEqual(first(users), user);
      }).then(function () {
        done();
      }, function (err) {
        done(err);
      });
    });

    it('should list all resources', function () {
      mockConnection.expectQuery('select * from `users`').respond(users);

      User.find().then(function (users) {
        assert.deepEqual(users, users);

        return User.all(['id', 'name']);
      }).then(function (users) {
        assert.deepEqual(users, users);
      }).then(function () {
        done();
      }, function (err) {
        done(err);
      });
    });
  });
});