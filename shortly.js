var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var redirect = require('express-redirect');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());

// app.use(redirect);
app.use(session({
  name: 'shortly sess',
  secret: 'coding things',
  resave: true,
  saveUninitialized: true,

}));

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


var checkUser = function(res, req) {
  var sess = req.session;
  if (sess.username) {
    res.render('index');
  } else {
    res.redirect('/login');
  }
};

app.get('/', 
function(req, res) {
  checkUser(res, req);
});

app.get('/create', 
function(req, res) {
  checkUser(res, req);
});

app.get('/links', 
function(req, res) {


  var sess = req.session;
  if (!sess.username) {
    res.redirect('/login');
  } else {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });
  }
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        })
        .catch(function(error) {
          console.log(error);
          res.status(400);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/logout', function(req, res) {
  req.session.destroy();
  res.header('/login');
  res.redirect('/login');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  User.query('where', 'username', '=', username)
   .fetch()
   .then(function(model) {
     if (!model) {
       res.header('/login');
       res.redirect('/login');
     } else {
      
       var salt = model.get('salt');
       var hashedPass = model.get('password');
       var passTest = bcrypt.hashSync(password, salt);

       if (hashedPass === passTest) {
         res.status(201);
         req.session.username = username;
         res.location('/');
         res.redirect('/');

       }
     }


   })
   .catch(function(error) {
     console.log(error);
     res.status(400);
   });
});


app.get('/signup', function(req, res) {
  console.log('hello from signup');
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  // var salt = bcrypt.genSaltSync(10);
  // var hash = bcrypt.hashSync(password, salt);
  // console.log(salt, hash);

  new User({username: username }).fetch()
  .then(function(found) {
    if (found) {
      alert('Account already exists');
      res.redirect('/signup');
    } else {
      Users.create({
        username: username,
        password: password,
        // salt: salt
      })
      .then(function(newUser) {

        res.status(201);
        req.session.username = username;
        res.location('/');
        res.redirect('/');

      })
      .catch(function(error) {
        console.log(error);
        res.status(400);
      });
    }
  })
  .catch(function(error) {
    console.log(error);
    res.status(400);
  });
});




/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
