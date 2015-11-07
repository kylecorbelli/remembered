'use strict';

var mailgun_apiKey = 'key-3469fca92b2575af303fd939812a5e2b';
var mailgun_domain = 'sandboxd2169beccc6343ec9dd708a32b30ff80.mailgun.org';
var mailgun = require('mailgun-js')({
    apiKey: mailgun_apiKey,
    domain: mailgun_domain
});

var mailData = {
    from: 'remembered <info@remembered.com>',
    to: 'Kyle Corbelli <kyle.corbelli@gmail.com>',
    subject: 'Your password - remembered',
    html: '<h1>Here is your password:</h1><p>buttsauce</p>'
};

mailgun.messages().send(mailData, function(err, body) {
    if (err) console.error(err);
    console.log(body);
});