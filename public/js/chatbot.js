function ChatBot(){

}

ChatBot.prototype.say = function(message) {
  var msg = '<div class="col-xs-10"><img src="/img/chatbot.png" alt="C" class="userAvatar pull-left" style="float:left"><h4 class="pull-left" style="float:left;">ChatBot&nbsp;'+
            '<div class="small">'+ (new Date()).toLocaleTimeString().replace(/:[0-9]{2} /, ' ') +'</div></h4>' +
            '<p class="pull-left" style="margin-left:20px;margin-top:20px;">'+ message +'</p></div>';
  $('.chat').append(msg);
};
