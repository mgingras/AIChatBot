function ChatBot(){
  this.learning = false;
  this.learningStack = []; //Stack to push things we're learning onto
}

ChatBot.prototype.chat = function(msg) {
  if(msg.match(/^what\s*\??$/)){
    if(this.learning){
      return this.say('You are teaching me about ' + this.learning.p);
    } else {
      return this.say('Please ask me questions in the form of "What is/are/do/does ..."');
    }
  }
  if(this.learning){
    this.learnParse(msg);
  } else {
    this.respond(msg);
  }
};

ChatBot.prototype.respond = function(msg) {
  // console.log('respond: ' + msg);
  $.post('/msg', {msg: msg}, function(res) {
    if(res.key){
      this.prompt = true;
      this.learning = res.key;
      this.say(res.say);
      if(res.known){
        return this.say("Can you teach me anything else?");
      }
    } else {
      if(res.say){
        return this.say(res.say);
      } else{
        return this.say(res);
      }
    }
  }.bind(this));
};

ChatBot.prototype.learnParse = function(msg) {
  if(msg === 'done'){
    var learnt = this.learning.s;
    this.learning = null;
    this.learningStack = [];
    return this.say('Thanks for teaching me about ' + learnt);
  }
  if(this.prompt){
    if(msg.match(/yes|sure|okay|yeah|ye|ya|aight/ig)){
      this.prompt = false;
      return this.say('Awesome, what can you tell me about ' + this.learning.p);
    } else if(msg.match(/no|nah|nope/ig)){
      this.prompt = false;
      this.learning = false;
      this.learningStack = [];
      return this.say('Okay then :(');
    } else {
      return this.say('Will you teach me'+ (this.learning ? ' more about ' + this.learning.p : '') +'? (yes/no)');
    }
  } else {
    this.parse(msg);
  }
};

ChatBot.prototype.say = function(message) {
  var msg = '<div class="row message">'+
            '<div class="col-xs-10"><img src="/img/chatbot.png" alt="C" class="userAvatar pull-left" style="float:left"><h4 class="pull-left" style="float:left;">WhatBot&nbsp;'+
            '<div class="small">'+ (new Date()).toLocaleTimeString().replace(/:[0-9]{2} /, ' ') +'</div></h4>' +
            '<p class="pull-left" style="margin-left:20px;margin-top:20px;">'+ message +'</p></div></div>';
  $('.chat').append(msg);
  $('#chat').scrollTop($('#chat')[0].scrollHeight);
};

ChatBot.prototype.parse = function(msg) {
  $.post('/parse', {msg: msg}, function(res) {
    if(!res.key){
      return this.say('Sorry I didn\'t quite understand what you tried to teach me');
    }
    // else if(res.key && res.key.s && res.key.s === this.learning.s){
    //   return this.say('Sorry I don\'t think that makes sense.');
    // }
    if(res.key.s === '_key'){
      res.key = this.learning;
    } else if(res.subkey === this.learning.s){
      res.subkey = res.key.s;
      res.key = this.learning;
    } else if(res.key.s !== this.learning.s){
      res.key.s = this.learning.s;
    }

    if(res.subkey === res.key.s || res.key.s === res.context){
      console.log('Error...');
      console.dir(res);
      return this.say('Sorry I don\'t think that makes sense');
    }

    console.log('/parse: %o', res);
    return this.learn(res, msg);
  }.bind(this));
};

ChatBot.prototype.learn = function(toLearn, msg) {
  var data = {key: this.learning.s};
  // If we say that something is something else, we should know what something else is...
  if(toLearn.context === 'is'){
    if(toLearn.knows && toLearn.knows._id === toLearn.subkey){
      // If we know and the know matches the id of the subkey we are associating...
      chatbot.learning.context = 'is';
      var association;
      if(_.isArray(toLearn.knows.is)){
        var _i, is = false;
        for(_i in toLearn.knows.is){
          if(toLearn.knows.is[_i].split(' ').length !== 1){
            is = true;
          }
        }
        association = is ? 'is' : toLearn.knows.is[0];
      } else {
       association = toLearn.knows.is.split(' ').length === 1 ? toLearn.knows.is : 'is';
      }
      data[association] = toLearn.subkey;
      learn(data);

    } else if(_.isArray(toLearn.subkey)){
      chatbot.learning.context = 'is';
      var i;
      for(i in toLearn.subkey){
        this.learningStack.push({
          key: this.learning,
          context: 'is',
          msg: toLearn.key.s + ' ' + toLearn.context + ' ' + toLearn.subkey[i]
        });
      }
      var next = chatbot.learningStack.pop();
      if(next){
        this.learning = next.key;
        this.learning.context = next.context;
        this.parse(next.msg);
      }
    } else if(toLearn.subkey.split(' ').length > 1){
      chatbot.learning.context = 'is';
      // If we are doing a base level 'is' association
      data.is = toLearn.subkey;
      learn(data);
    } else{
      $.post('/knows', {key: toLearn.subkey}, function(knows) {
        if(knows && knows._id === toLearn.subkey){
          console.dir(toLearn);
          // We did some jiggleing client side so the knows object was fucked,
          var association;
          if(_.isArray(knows.is)){
            var _i, is = false;
            for(_i in knows.is){
              if(knows.is[_i].split(' ').length !== 1){
                is = true;
              }
            }
            association = is ? 'is' : knows.is[0];
          } else {
           association = knows.is.split(' ').length === 1 ? knows.is : 'is';
          }
          if(toLearn.knows._id === this.learning.s && _.contains(toLearn.knows.is, knows.is)){
            association = 'is';
          }
          data[association] = toLearn.subkey;
          learn(data);
        } else {
          console.log('HERE: ');
          console.log('key: ' + this.learning.s);
          console.dir(toLearn);
          this.say('Sorry I don\'t know anything about ' + toLearn.subkey + ' can you teach me?');
          this.prompt = true;
          this.learningStack.push({key: this.learning, msg: msg});
          this.learning = { s: toLearn.subkey, p: toLearn.subkey };
        }
      }.bind(this));
    }
  } else {
    data[toLearn.context] = toLearn.subkey;
    learn(data);
  }
};

function learn(learnData){
  console.log('POST /learn:');
  console.dir(learnData);
  $.post('/learn', learnData, function(res) {
    var thanksMsg = 'Thanks for teaching me that ';
    _.forEach(learnData, function(v, k) {
      if(k === 'key'){
        if(chatbot.learning.context && chatbot.learning.context === 'is'){
          thanksMsg += 'a ' + chatbot.learning.s + '\'s ' ;
        } else {
          thanksMsg += chatbot.learning.p + ' ';
        }
      } else {
        if(!isNaN(parseInt(v))){
          thanksMsg += 'have ' + v + ' ' + k +'.';
        } else if(chatbot.learning.context && chatbot.learning.context === 'is'){
          thanksMsg += k + ' is ' + v + '.';
        } else {
          thanksMsg += (k === 'is' ? 'are' : k) + ' ' + v + '.';
        }
      }
    }.bind(this));
    chatbot.say(thanksMsg);
    var next = chatbot.learningStack.pop();
    if(next){
      chatbot.learning = next.key;
      chatbot.parse(next.msg);
    } else if(!next){
      chatbot.say('Can you teach me anything else about ' + chatbot.learning.s + '?');
      chatbot.prompt = true;
    }
  });
}
