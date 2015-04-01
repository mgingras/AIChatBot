/* globals ChatBot */
var chatbot;
var user = {};
$(function() {
  var username = null;
  while(username === null || username === ""){
    username = prompt("Please enter your name");
  }
  user.username = username;
  chatbot = new ChatBot();
  $('#send').click(sendMessage);
  $('#message').keypress(function(e) {
    if (e.keyCode === 13) {
      e.preventDefault();
      sendMessage();
    };
  });
});

function sendMessage() {
  var msg = $('#message').val();
  $('#message').val('');
  say(msg);
  chatbot.say(msg);
  $('#chat').scrollTop($('#chat')[0].scrollHeight);
}

function say(text) {
  var msg = ''+
    '<div class="row message">'+
      '<div class="col-xs-10 col-xs-offset-2"><i class="userAvatar avatar avatar-color-33 avatar-plain pull-right avatar-letter-'+user.username[0].toLowerCase()+'"></i>'+
        '<h4 class="pull-right">'+ user.username +
          '<div class="small">' + (new Date()).toLocaleTimeString().replace(/:[0-9]{2} /, ' ') + '</div>'+
        '</h4>'+
        '<p class="pull-right" style="margin-right:20px;margin-top:20px;">'+ text +
        '</p>' +
      '</div>'+
    '</div>';
  $('.chat').append(msg);
}

