var request = require('request');
var nlp = {
  getParse: function(text, callback){
    if (text.length >250){
      return false; //"ERROR: input length greater than 250 characters. Please parse one sentence at a time";
    }
    else {
      var url = 'http://nlp.naturalparsing.com/api/parse?input=?format=json&jsoncallback=&input=' + encodeURIComponent(text) +"&version=0.1&options=sentence";
      request.get(url, function(e, r, b) {
        b = b.replace(/var cback =; cback\(/, '');
        b = b.replace(/\);$/, '');
        console.dir(b);
        try {
          b = JSON.parse(b);
        } catch (err){
          b = {'error': 'could not JSON parse the nlp parsing for "' + text + '"'};
        }
        callback(b);
      });
    }
    return true;
  },

  JSONtoString: function(data){
  if (data.words === null ){
    return;
  }
  else{
    var x;
    var output = "";
    for (x in data.words){
      output = output + data.words[x].value + "/" + data.words[x].tag + " ";
    }
    return output;
    }
  }
};

module.exports = nlp;
