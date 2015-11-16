'use strict';

var mailgun_apiKey = 'key-3469fca92b2575af303fd939812a5e2b';
var mailgun_domain = 'sandboxd2169beccc6343ec9dd708a32b30ff80.mailgun.org';

var express = require('express'),
    MongoClient = require('mongodb').MongoClient,
    ObjectID = require('mongodb').ObjectID,
    bcrypt = require('bcrypt'),
    nodemailer = require('nodemailer'),
    uniqid = require('uniqid'),
    mailgun = require('mailgun-js')({
        apiKey: mailgun_apiKey,
        domain: mailgun_domain
    });

var router = express.Router();

var dbUrl = 'mongodb://admin:jakeyboy@ds051534.mongolab.com:51534/remembered';
// var dbUrl = 'mongodb://localhost:27017/login';


router.get('/public/checkbox.ico', function(req, res, next) {
    res.send('/checkbox.ico');
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'remembered' });
});

router.get('/aboutus', function(req, res, next) {
    res.render('aboutUs', {
        title: 'remembered | About Us'
    });
});

router.get('/updatesession', function(req, res, next) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    if (req.session) {
        res.end(JSON.stringify(req.session));
    } else {
        res.end(JSON.stringify({}));
    }
});


// Login to an existing account (AJAX)
router.post('/login', function(req, res, next) {
    MongoClient.connect(dbUrl, function(err, db) {
        if (err) throw err;
        db.collection('users').find({
            "email": req.body.email
        }).toArray(function(err, docs) {
            if (err) throw err;
            if (docs.length === 1) {
                if (bcrypt.compareSync(req.body.password, docs[0].password)) {
                    req.session._id = docs[0]._id;
                    req.session.firstName = docs[0].firstName;
                    req.session.lastName = docs[0].lastName;
                    req.session.email = docs[0].email;
                    req.session.items = docs[0].items;
                    delete docs[0].password;
                    req.session.save(function(err) {
                        if (err) throw err;
                        res.end(JSON.stringify(docs[0]));
                    });
                } else {
                    res.json({'loginError': 'The email and password do not match. Please try again.'});
                }
            } else {
                res.json({'loginError': 'The entered email has not been registered.'});
            }
            db.close();
        });
    });
});

router.post('/signup', function(req, res, next) {
    MongoClient.connect(dbUrl, function(err, db) {
        if (err) throw err;
        // Check for valid first name pattern:
        if (req.body.firstName.match(/^[a-z]+\.?\s?[a-z]*\.?$/i)) {
            // Check for valid email pattern:
            if (req.body.email.match(/^\w+[\.\-]?\w+\@[a-z0-9\-]+\.?[a-z0-9\-]+\.[a-z]{2,3}$/i)) {
                // Check for existence of the email in the database:
                db.collection('users').find({
                    "email": req.body.email
                }).toArray(function(err, docs) {
                    if (err) throw err;
                    if (docs.length > 0) {
                        res.json({'signUpError': 'It looks like that email has already been registered here. Please log into your existing account.'});
                    } else {
                        // Check that the password and confirmation password match:
                        if (req.body.password === req.body.passwordConf) {
                            // Check that the password is alphanumeric and between 4 and 20 characters
                            if (req.body.password.match(/^\w{4,20}$/i)) {
                                var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
                                db.collection('users').insert({
                                    "email": req.body.email,
                                    "firstName": req.body.firstName,
                                    "password": hash,
                                    "items": []
                                }, function(err, data) {
                                    if (err) throw err;
                                    db.collection('users').find({
                                        "email": req.body.email
                                    }).toArray(function(err, docs) {
                                        if (err) throw err;
                                        req.session._id = docs[0]._id;
                                        req.session.firstName = req.body.firstName;
                                        req.session.email = req.body.email;
                                        req.session.items = [];
                                        req.session.save(function(err) {
                                            if (err) throw err;
                                            res.json(req.session);
                                            db.close();
                                        });
                                    });
                                });
                            } else {
                                db.close();
                                res.json({'signUpError': 'Password must be 4 - 20 alphanumeric characters.'});
                            }
                        } else {
                            db.close();
                            res.json({"signUpError": 'Password and confirmation do not match'});
                        }
                    }
                });
            } else {
                db.close();
                res.json({"signUpError": 'Please enter a valid email address.'});
            }
        } else {
            db.close();
            res.json({'signUpError': 'Please enter a valid first name.'});
        }
    });
});

router.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
        if (err) throw err;
        res.redirect('/');
    });
});

router.post('/additem', function(req, res, next) {
    if (!req.body.itemToAdd) {
        res.json({'addItemError': 'No item entered by user.'});
    } else {
        MongoClient.connect(dbUrl, function(err, db) {
            if (err) throw err;
            db.collection('users').update({
                "_id": new ObjectID(req.session._id)
            }, {
                $addToSet: {
                    "items": req.body.itemToAdd
                }
            }, function(err, data) {
                if (err) throw err;
                req.session.items.push(req.body.itemToAdd);
                req.session.save(function(err) {
                    if (err) throw err;
                    res.json(data);
                    db.close();
                });
            });
        });
    }
});

router.post('/removeitem', function(req, res, next) {
    MongoClient.connect(dbUrl, function(err, db) {
        if (err) throw err;
        db.collection('users').update({
            "_id": new ObjectID(req.session._id)
        }, {
            $pull: {
                "items": req.body.itemToRemove
            }
        }, function(err, data) {
            if (err) throw err;
            req.session.items.splice(req.session.items.indexOf(req.body.itemToRemove), 1);
            req.session.save(function(err) {
                if (err) throw err;
                res.json(data);
                db.close();
            });
        });
    });
});

router.post('/emailpassword', function(req, res) {
    var errors = {};
    // Check for valid email pattern:
    if (!req.body.forgotPasswordEmail.match(/^\w+[\.\-]?\w+\@[a-z0-9\-]+\.?[a-z0-9\-]+\.[a-z]{2,3}$/i)) {
        errors.emailError = 'Please enter a valid email address';
        errors.errorFlag = true;
        json(errors);
    } else {
        MongoClient.connect(dbUrl, function(err, db) {
            if (err) throw err;
            var newPassword = uniqid();
            var hash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
            db.collection('users').find({
                "email": req.body.forgotPasswordEmail
            }).toArray(function(err, docs) {
                // Check if the provided email is in the databse
                if (docs.length === 0) {
                    errors.errorFlag = true;
                    errors.emailError = 'The email provided hasn\'t been registered yet. Simply sign up to get started.';
                    res.json(errors);
                    db.close();
                } else {
                    db.collection('users').update({
                        "email": req.body.forgotPasswordEmail
                    }, {
                        $set: {
                            "password": hash
                        }
                    }, function(err, data) {
                        var message = '<h1>Your temporary password from remembered.com</h1>';
                        message += '<p>Your new temporary password is <strong>' + newPassword + '</strong></p>';
                        message += '<p>Please log in with your new temporary password and then change your password to something more memorable in the User Settings</p>';
                        var mailData = {
                            from: 'remembered <pass@remembered.com>',
                            to: req.body.forgotPasswordEmail,
                            subject: 'Password Reset - remembered.com',
                            html: message
                        };
                        mailgun.messages().send(mailData, function(err, body) {
                            if (err) throw err;
                            res.json({message: 'A temporary password has been emailed to you. Please log in with this temporary password and then change your password to something more memorable in the User Settings.'});
                            db.close();
                        });
                    });
                }
            });
        });
    }
});

router.get('/settings', function(req, res) {
    if (!req.session._id || req.session._id === '') {
        res.redirect('/');
    } else {
        res.render('userSettings', {
            title: 'remembered | My Settings'
        });
    }
});

router.post('/updatesettings', function(req, res) {
    var errors = {};
    // Check for valid first name pattern:
    if (!req.body.firstName.match(/^[a-z]+\.?\s?[a-z]*\.?$/i)) {
        errors.firstNameError = 'Please enter a valid first name';
    }
    // Check for valid email pattern:
    if (!req.body.email.match(/^\w+[\.\-]?\w+\@[a-z0-9\-]+\.?[a-z0-9\-]+\.[a-z]{2,3}$/i)) {
        errors.emailError = 'Please enter a valid email address';
    }
    // Check that the password is alphanumeric and between 4 and 20 characters
    if (!req.body.password.match(/^\w{4,20}$/i)) {
        errors.passwordError = 'Please enter a valid password (between 4 and 20 alphanumeric characters)';
    }
    // If no errors, proceed:
    if (Object.keys(errors).length === 0) {
        MongoClient.connect(dbUrl, function(err, db) {
            if (err) throw err;
            db.collection('users').find({
                "_id": new ObjectID(req.body._id)
            }).toArray(function(err, docs) {
                if (err) throw err;
                // Check that the password provided matches the one on file:
                if (bcrypt.compareSync(req.body.password, docs[0].password)) {
                    db.collection('users').update({
                        "_id": new ObjectID(req.body._id)
                    }, {
                        $set: {
                            "firstName": req.body.firstName,
                            "email": req.body.email // then password...instead of separate change password?
                        }
                    }, function(err, data) {
                        if (err) throw err;
                        req.session.firstName = req.body.firstName;
                        req.session.email = req.body.email;
                        req.session.save(function(err) {
                            if (err) throw err;
                            res.json({message: 'Your settings have been saved'});
                            db.close();
                        });
                    });
                } else {
                    res.json({
                        errorFlag: true,
                        passwordError: 'Incorrect password. Please try again.'
                    });
                    db.close();
                }
            });
        });
    } else {
        errors.errorFlag = true;
        res.json(errors);
    }
});

router.post('/changepassword', function(req, res) {
    var errors = {};
    // Check that the current password is alphanumeric and between 4 and 20 characters
    if (!req.body.changePassCurrPass.match(/^\w{4,20}$/i)) {
        errors.passwordError = 'Please enter valid passwords (between 4 and 20 alphanumeric characters)';
    }
    // Check that the new password is alphanumeric and between 4 and 20 characters
    if (!req.body.changePassNewPass.match(/^\w{4,20}$/i)) {
        errors.passwordError = 'Please enter valid passwords (between 4 and 20 alphanumeric characters)';
    }
    // Check that the new password confirmation is alphanumeric and between 4 and 20 characters
    if (!req.body.changePassConfPass.match(/^\w{4,20}$/i)) {
        errors.passwordError = 'Please enter valid passwords (between 4 and 20 alphanumeric characters)';
    }
    // Check that the new password matches the new password confirmation:
    if (req.body.changePassNewPass !== req.body.changePassConfPass) {
        errors.passwordError = 'The new password and password confirmation do not match. Please try again.';
    }
    // If the 'errors' object is empty, proceed. Otherwise return an error object to the AJAX request.
    if (Object.keys(errors).length === 0) {
        MongoClient.connect(dbUrl, function(err, db) {
            if (err) throw err;
            db.collection('users').find({
                "_id": new ObjectID(req.body._id)
            }).toArray(function(err, docs) {
                if (err) throw err;
                // Check that the password provided matches the one on file:
                if (bcrypt.compareSync(req.body.changePassCurrPass, docs[0].password)) {
                    // Update the password on file:
                    var hash = bcrypt.hashSync(req.body.changePassNewPass, bcrypt.genSaltSync(10));
                    db.collection('users').update({
                        "_id": new ObjectID(req.body._id)
                    }, {
                        $set: {
                            "password": hash
                        }
                    }, function(err, data) {
                        if (err) throw err;
                        res.json({message: 'Your password has been saved'});
                        db.close();
                    });
                } else {
                    errors.passwordError = 'Password does not match the password on file. Please try again.';
                    errors.errorFlag = true;
                    res.json(errors);
                    db.close();
                }
            });
        });
    } else {
        errors.errorFlag = true;
        res.json(errors);
    }
});

router.post('/deleteaccount', function(req, res) {
    var errors = {};
    // Check that the current password is alphanumeric and between 4 and 20 characters
    if (!req.body.password.match(/^\w{4,20}$/i)) {
        errors.passwordError = 'Please enter valid passwords (between 4 and 20 alphanumeric characters)';
        errors.errorFlag = true;
        res.json(errors);
    } else {
        MongoClient.connect(dbUrl, function(err, db) {
            if (err) throw err;
            db.collection('users').find({
                "_id": new ObjectID(req.session._id)
            }).toArray(function(err, docs) {
                if (err) throw err;
                // Check that the confirmation password is the same as the password on file:
                if (bcrypt.compareSync(req.body.password, docs[0].password)) {
                    // Delete the whole account:
                    db.collection('users').remove({
                        "_id": new ObjectID(req.session._id)
                    }, function(err, data) {
                        if (err) throw err;
                        // Deal with destroying the session and redirecting the user somewhere?
                        req.session._id = '';
                        req.session.email = '';
                        req.session.firstName = '';
                        req.session.items = '';
                        req.session.save(function(err) {
                            if (err) throw err;
                            res.json({message: 'Your profile has been deleted'});
                            db.close();
                        });
                    });
                } else {
                    errors.errorFlag = true;
                    errors.passwordError = 'The password entered doesn\'t match the password on file.';
                    res.json(errors);
                    db.close();
                }
            });
        });
    }
});

router.get('/accountdeleted', function(req, res) {
    if (req.session._id !== '') {
        res.redirect('/');
    } else {
        res.render('accountDeleted', {
            title: 'remembered | Account Deleted'
        });
    }
});

module.exports = router;
