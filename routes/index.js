var express = require('express');
var inflect = require('i')();
var bot = require('../bin/bot');

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Whatbot' });
});

/* POST message. */
router.post('/msg', function(req, res, next) {
  if(req.body && req.body.msg){
    var msg = req.body.msg;
    if(msg.split(' ')[0].toLowerCase() === 'why'){
      return res.send({say: 'I ain\'t no Whybot, I\'m a Whatbot!!'});
    } else if (msg.split(' ')[0].toLowerCase() !== 'what'){
      return res.send({say: 'Try phrasing your questions in the form of "What is/are/do ..."'});
    }
    bot.parse(msg, function(key, subkey, context) {
      bot.respond(key, subkey, context, function(bot_resp) {
        res.send(bot_resp);
      });
    });
  }
});

/* POST learn. */
router.post('/learn', function(req, res, next) {
  if(req.body){
    console.dir(req.body);
    bot.learn(req.body, function(bot_resp) {
      res.send(bot_resp);
    });
  }
});

router.post('/parse', function(req, res, next) {
  if(req.body && req.body.msg){
    var msg = req.body.msg;
    bot.parse(msg, function(key, subkey, context) {
      if(key){
        bot.knows(key, function(knows) {
          if(key.split(' ').length === 1){
            key = {
              s: inflect.singularize(key),
              p: inflect.pluralize(key)
            };
          }
          return res.send({
            key: key,
            subkey: subkey,
            context: context,
            knows: knows
          });
        });
      } else{
        return res.send({
          key: undefined
        });
      }
    });
  }
});

module.exports = router;
