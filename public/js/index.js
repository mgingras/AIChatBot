/* globals ChatBot */
var chatbot;
var user = null;
$(function() {
  while(user === null || user === ""){
    user = prompt("Please enter your name");
  }
  chatbot = new ChatBot();
});
