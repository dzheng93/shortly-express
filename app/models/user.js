var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,

  initialize: function() {
    this.on('creating', function(model, attrs, option) {
      var password = model.get('password');
      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(password, salt);
      model.set('salt', salt);
      model.set('password', hash);

    });
  },
});

module.exports = User;
