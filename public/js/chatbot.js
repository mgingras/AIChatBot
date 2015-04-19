function ChatBot(){
  this.learning = false;
  this.learningStack = []; //Stack to push things we're learning onto
}

ChatBot.prototype.chat = function(msg) {
  if(msg === 'what' || msg === 'what?'){
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
  console.log('respond: ' + msg);
  $.post('/msg', {msg: msg}, function(res) {
    if(res.key){
      this.prompt = true;
      this.learning = res.key;
      this.say(res.say);
      if(res.known){
        this.say("Can you teach me anything else?");
      }
    } else {
      this.say(res);
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
      return this.say('Will you teach me? (yes/no)');
    }
  } else {
    this.learn(msg);
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

ChatBot.prototype.learn = function(msg) {
  $.post('/parse', {msg: msg}, function(res) {
    if(!res.key){
      return this.say('Sorry I didn\'t quite understand what you tried to teach me');
    } else if(res.key && res.key.s && res.key.s === this.learning.s){
      return this.say('Sorry I don\'t think that makes sense.');
    }
    console.log('/parse: %o', res);
    // If the key that we are trying to assicate exists
    if(res.knows && res.knows.is){
      // Association will either be a key into another object which has an is or an is description
      var association = (res.knows.is.split(' ').length === 1) ? res.knows.is : 'is'; // If what we just learnt is the base level then we are that, otherwise that is an attribute.
      var data = {
        key: this.learning.s
      };
      data[association] = res.key.s;
      $.post('/learn', data,function() {
        if(association === 'is'){
          this.say('Thanks for teaching me that a ' + this.learning.p + ' ' + association + ' a ' + res.key.s);
        } else {
          this.say('Thanks for teaching me that a ' + this.learning.p + '\'s ' + association + ' is ' + res.key.s);
        }
        while(this.learningStack.length > 0){
          var learn = this.learningStack.pop();
          this.learning = learn.key;
          this.learn(learn.msg);
        }
      }.bind(this));
    } else{
      if(!res.key.s && res.key.split(' ').length > 1){
        // What we are learning about is a base level.
         $.post('/learn', { key: this.learning.s, is: res.key }, function() {
           this.say('Thanks for teaching me that ' + this.learning.s + ' is ' + res.key);
           while(this.learningStack.length > 0){
             var learn = this.learningStack.pop();
             this.learning = learn.key;
             this.learn(learn.msg);
           }
        }.bind(this));
      } else {
        console.log('here');
        this.say('Sorry I don\'t know anything about ' + res.key.p + ' can you teach me?');
        this.prompt = true;
        this.learningStack.push({key: this.learning, msg: msg});
        this.learning = res.key;
      }
    }
  }.bind(this));
};
