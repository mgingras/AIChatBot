function ChatBot(){

}

ChatBot.prototype.say = function(message) {
  var msg = '<div class="col-xs-10 pull-right"><img src="/img/chatbot.png" alt="" class="avatar"><h4>ChatBot&nbsp;'+
            '<span class="small">'+ (new Date()).toLocaleTimeString().replace(/:[0-9]{2} /, ' ') +'</span></h4>' +
            '<p>'+ message +'</p></div>';
  $('.message').append(msg);
};
