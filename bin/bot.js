var _ = require('lodash');
var async = require('async');
var inflect = require('inflected');
var WtoN = require('words-to-num');
var nlp = require('./nlp');

// Database to use...
var db = process.env.db || 'http://localhost:5984';
var nano = require('nano')(db);
var knowledgeBase = nano.db.use('knowledge');

var bot = {
  parse: function(msg, callback) {
    msg = msg.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " "); // Strip out punctuation, we ain't smart enough for that yet
    msg = msg.toLowerCase();
    var splitMsg = msg.split(' ');
    if(splitMsg.length < 2){
      return callback(undefined);
    } else if(splitMsg[0] === 'a'){
      msg = splitMsg.slice(1).join(' ');
    }

    nlp.parseText(msg, function(parsed) {
      // console.log('---- NLP:');
      // console.dir(parsed.words);
      // console.dir(parsed.data);
      // console.log('---------');

      var key, subkey;
      var data = parsed.data; // Get the parsed nouns, verbs, and adjectives
      var context = data.verbs.length > 0 ? data.verbs.shift().value : 'is';
      context = bot.singularize(context);

      console.log(msg);
      // Nouns
      if(data.nouns.length === 1){
        // What is a cow
        // A cow is black
        key = data.nouns[0].value;
      } else if(data.nouns.length === 2){
        // What color is a cow
        if(parsed.words[0].tag.match(/^DT/)){
          key = data.nouns[0].value;
          subkey = data.nouns[1].value;
        } else {
          subkey = data.nouns[0].value;
          key = data.nouns[1].value;
        }
      } else {
        key = '_key';
      }

      // Adjectives
      if(data.adj.length > 0 && !subkey){
        subkey = _.pluck(data.adj, 'value');
        subkey = subkey.length === 1 ? subkey[0] : subkey;
      }

      // Subkey is context if no key
      if(!subkey){
        if(data.verbs.length > 0){
          subkey = data.verbs[data.verbs.length - 1].value;
        } else {
          subkey = context;
        }
      }
      if(parsed.words[0].value === 'is' && key){
        subkey = key;
        key = '_key';
      }

      context = context === 'have' ? 'has' : context;

      // If has something and there is a count, do some jiggling
      if(context === 'has' && parsed.data.counts.length === 1){
        if(key && subkey){
          context = key;
          key = subkey;
          subkey = WtoN.convert(parsed.data.counts[0].value) + '';
        }
      }
      // If it is an 'is' message and long probably a base level description.
      if(key && (context === 'is' || context === 'are') && msg.split(' ').length > 8){
        subkey = msg.split(' ' + context + ' ').slice(1).join(' ' + context + ' ');
      }

      context = context === 'are' ? 'is' : context;

      if(subkey === 'are' && context === 'is'){
        subkey = 'is';
        context = 'are';
      }

      // Keys should always be singularized I guess....
      key = bot.singularize(key);
      if(_.isArray(subkey)){
        var i;
        for(i in subkey){
          bot.singularize(subkey[i]);
        }
      } else{
        subkey = bot.singularize(subkey);
      }

      console.log('------- PARSE FUNCTION -------');
      console.log('context: ' + context);
      console.log('key: ' + key);
      console.log('subkey: ' + subkey);
      console.log('------------------------------');

      callback(key, subkey, context);
    });
  },

  respond: function(key, subkey, context, callback) {
    // Lookup the key and subkey
    if(key && subkey){
      knowledgeLookup(key, function(kbRes) {
        console.dir(kbRes);
        if(kbRes === 'None'){
          return callback({
            known: false,
            key: {
              s: bot.singularize(key),
              p: inflect.pluralize(key)
            },
            say:'Sorry I don\'t know nothing about ' + key + '. Can you tell me?'
          });
        }
        var response = '';
        if(!kbRes[subkey] && kbRes[inflect.pluralize(subkey)]){
          subkey = inflect.pluralize(subkey);
        }
        if(!kbRes[subkey]){
          response += 'Sorry I don\'t know what ' + subkey + ' a ' + bot.singularize(key) + ' is. Can you teach me?';
          if(kbRes.is){
            response += ' But i do know that a ' + bot.singularize(key) + ' is ' + (kbRes.is.split(' ').length === 1 ? 'a ' + kbRes.is : kbRes.is) + '. Can you teach me more?';
          }

          return callback({
            known: false,
            key: {
              s: bot.singularize(key),
              p: inflect.pluralize(key)
            },
            say: response
          });
        }
        if(subkey === 'is'){
          if(context === 'are' || context === 'does'){
            response = inflect.pluralize(key);
          } else {
            response = 'A ' + bot.singularize(key);
          }
          if(kbRes.is){
            response += (context === 'is' ? ' is a' : ' ' + context);

            response += ' ' + arrayToSentence(kbRes.is, context !== 'is');
            if(response[response.length - 1].match(/[^\w\s]|_/g)){
              response = response.slice(0,-1);
            }
          }
          var values = [], plural;
          _.forEach(kbRes, function(v, k) {
            if(k === 'is' || k[0] === '_'){
              return;
            }
            if(k === 'associated'){
              return values.push(' such as ' + arrayToSentence(v));
            }
            if(!isNaN(parseInt(v))){
              return values.push(' that have ' + v + ' ' + (parseInt(v) <= 1 ? bot.singularize(k) : inflect.pluralize(k)));
            } else {
              plural = _.isArray(v) && v.length > 1;
              return values.push(' ' + 'that ' + k + ' ' + arrayToSentence(v));
            }
          });
          response += arrayToSentence(values);
          response = response[0].toUpperCase() + response.slice(1) + '.';
          return callback({
            known: true,
            key: {
              s: bot.singularize(key),
              p: inflect.pluralize(key)
            },
            say: response
          });
        } else {
          nlp.parseText(subkey, function(parsed) {
            console.log(parsed);
            if(!isNaN(parseInt(kbRes[subkey]))){
              response = 'A ' + bot.singularize(key) +  ' has ' + kbRes[subkey] + ' ' + inflect.pluralize(subkey) + '.';
            } else if(parsed.data.nouns.length === 1){
              response = 'A ' + bot.singularize(key) + '\'s ' + bot.singularize(subkey) + ' is ' + arrayToSentence(kbRes[subkey]);
            } else {
              response = 'A ' + bot.singularize(key) + ' ' + inflect.pluralize(subkey) + ' ' + arrayToSentence(kbRes[subkey]);
            }
            console.log(response);
            return callback({
              known: true,
              key: {
                s: bot.singularize(key),
                p: inflect.pluralize(key)
              },
              say: response
            });
          });
        }
      });
    } else if(!key && subkey){

    } else {
      return callback('Sorry you\'ve confused me..');
    }
  },

  learn: function(knowledge, callback) {
    var key = knowledge.key;
    delete knowledge.key; // Take key out of object to be stored (already is the key to document)

    insertKnowledge(key, knowledge, function(ok) {
      if(!ok){
        return callback('error');
      }
      // Reverse mapping to key from values
      var linked = [key];
      var values = [];
      _.forEach(knowledge, function(v, k) {
        values.push(function(_callback) {
          if (_.isArray(v)) {
            var _values = [];
            _.forEach(v, function(n) {
              _values.push(function(__callback) {
                insertKnowledge(n, {associated: linked}, function(ok) {
                  if(!ok){
                    return __callback('error');
                  }
                  return __callback(null, 'success');
                });
              });
            });
            async.parallel(_values, function(err, results) {
              if(err){
                return _callback('error');
              }
              return _callback(null, 'success');
            });
          } else {
            if(v.split(' ').length > 1){
              return _callback(null, 'success');
            }
            insertKnowledge(v, {associated: linked}, function(ok) {
              if(!ok){
                return _callback('error');
              }else{
                return _callback(null, 'success');
              }
            });
          }
        });
      });
      async.parallel(values, function(err, results) {
        if(err){
          return callback('error');
        }
        return callback(null, 'success');
      });
    });
  },

  knows: function(key, callback) {
    knowledgeBase.get(key, function(err, body) {
      if(err){
        return callback(false);
      } else {
        return callback(body);
      }
    });
  },
  singularize: function(text) {
    // The singularize fucks shit up sometimes...
    var ignoreWhenSignularize = ['is', 'has'];
    var singularizeRE = new RegExp(ignoreWhenSignularize.join('|'), 'ig');
    if(!text.match(singularizeRE)){
      return inflect.singularize(text);
    } else {
      return text;
    }
  }
};

// Helper Functions
function knowledgeLookup(key, callback) {
  knowledgeBase.get(key, function(err, keyKnowledge) {
    if(err){
      return callback('None');
    }
    return callback(keyKnowledge);
  });
}

function insertKnowledge(key, knowledge, callback) {
  callback = callback || function() {};
  knowledgeBase.get(key, function(err, body) {
    // No object with this key
    if(err){
      knowledgeBase.insert(knowledge, key, function(err) {
        if(err){
          console.log(knowledge);
          console.log('ERROR INSERTING NEW KNOWLEDGE!!!');
          console.dir(err);
          return callback(false);
        }
        return callback(true);
      });
    } else {
      // This key exists.
      _.merge(body, knowledge, function(a, b) {
        if (_.isArray(a)) {
          return _.unique(a.concat(b));
        } else if(a && a !== b){
          return [a, b];
        }
      });
      knowledgeBase.insert(body, key, function(err) {
        if(err){
          console.log('ERROR UPDATING NEW KNOWLEDGE!!!');
          console.dir(err);
          return callback(false);
        }
        return callback(true);
      });
    }
  });
}

function arrayToSentence(arr, pluralize){
  var res;
  if(pluralize){
    if(!_.isArray(arr)){
      return inflect.pluralize(arr);
    } else if(arr.length === 1){
      return inflect.pluralize(arr[0]);
    } else if(arr.length === 2){
      return inflect.pluralize(arr[0]) + ' and ' + inflect.pluralize(arr[1]);
    } else {
      res = '';
      for (var j = arr.length - 2; j >= 0; j--) {
        res += inflect.pluralize(arr[j]) + ', ';
      }
      res += 'and ' + inflect.pluralize(arr[arr.length - 1]);
      return res;
    }
  } else {
    if(!_.isArray(arr)){
      return arr;
    } else if(arr.length === 1){
      return arr[0];
    } else if(arr.length === 2){
      return arr[0] + ' and ' + arr[1];
    } else {
      res = '';
      for (var i = arr.length - 2; i >= 0; i--) {
        res += arr[i] + ', ';
      }
      res += 'and ' + arr[arr.length - 1];
      return res;
    }
  }
}

// Exports...
module.exports = bot;

