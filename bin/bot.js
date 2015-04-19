var _ = require('lodash');
var async = require('async');
var inflect = require('inflected');
var nano = require('nano')('http://localhost:5984');
var knowledgeBase = nano.db.use('knowledge');
var filterWords = ['a', 'an', 'the'];
var nlp = require('./nlp');


var bot = {
  parse: function(msg, callback) {
    msg = msg.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " "); // Strip out punctuation, we ain't smart enough for that yet
    msg = msg.toLowerCase();
    msg = msg.split(' ');
    msg = _.difference(msg, filterWords);
    console.log(msg);

    var context = msg[1];
    var subkey; // The key inside the key to refer to
    var key;
    console.log(context);
    switch(context){
      case 'is':
        // If the third word is a filler word, the key is the fourth word, probably.
        if(msg.length === 3){
          key = inflect.singularize(msg[2]);
        } else if(msg.length > 3) {
          key = msg.slice(2).join(' ') + '.';
        }
        subkey = 'is';
        break;
      case 'are':
        if(msg.length === 3){
          key = inflect.singularize(msg[2]);
        } else if(msg.length > 3) {
          key = msg.slice(2).join(' ') + '.';
        }
        subkey = 'is';
        // Plural of an is... Need to create relationship to is key...
        break;
      case 'do':
        if(msg.length === 3){
          key = inflect.singularize(msg[2]);
          subkey = msg[3]; // This should probably be 3..end
        }
        break;
      case 'does':
        if(msg.length > 3){
          key = inflect.singularize(msg[2]);
          subkey = msg[3]; // This should probably be 3..end
        }
        break;
    }
    console.log('context: ' + context);
    console.log('key: ' + key);
    console.log('subkey: ' + subkey);
    callback(key, subkey, context);
    // return callback(response);
  },

  respond: function(key, subkey, context, callback) {
    // Lookup the key and subkey
    if(key && subkey){
      knowledgeLookup(key, subkey, function(kbRes) {
        console.dir(kbRes);
        if(kbRes === 'None'){
          return callback({
            known: false,
            key: {
              s: inflect.singularize(key),
              p: inflect.pluralize(key)
            },
            say:'Sorry I don\'t know nothing about that. Can you tell me?'
          });
        }
        var response;
        if(context === 'are' || context === 'does'){
          response = inflect.pluralize(key);
        } else {
          response = inflect.singularize(key);
        }
        if(kbRes.is){
          response += (context === 'is' ? ' is a ' : ' are ');
          if(_.isArray(kbRes.is)){
            response += kbRes.is.join(', ');
          } else {
            response += (kbRes.is[0].toLowerCase() + kbRes.is.slice(1));
          }
          if(response[response.length - 1].match(/[^\w\s]|_/g)){
            response = response.slice(0,-1);
          }
        }
        _.forEach(kbRes, function(v, k) {
          if(k === 'is' || k[0] === '_'){
            return;
          }
          if(k === 'associated'){
            return response += ' such as ' + v.join(', ');
          }
          response += ' with ' + k + ' ' + v;
        });
        console.log(response);
        response = response[0].toUpperCase() + response.slice(1) + '.';
        return callback({
          known: true,
          key: {
            s: inflect.singularize(key),
            p: inflect.pluralize(key)
          },
          say: response
        });
      });
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
  }
};

// Helper Functions
function knowledgeLookup(key, subkey, callback) {
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

// Exports...
module.exports = bot;
