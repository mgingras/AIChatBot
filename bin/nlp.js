var request = require('request');
var nlp = {
  parseText: function(text, callback){
    if (text.length >250){
      return false; //"ERROR: input length greater than 250 characters. Please parse one sentence at a time";
    }
    else {
      var url = 'http://nlp.naturalparsing.com/api/parse?input=?format=json&jsoncallback=&input=' + encodeURIComponent(text) +"&version=0.1&options=sentence";
      request.get(url, function(e, r, b) {
        b = b.replace(/var cback =; cback\(/, '');
        b = b.replace(/\);$/, '');
        // console.dir(b);
        try {
          b = JSON.parse(b);
          b.sentence = JSONtoString(b);
          b.data = ParseJSON(b);
        } catch (err){
          b = {'error': 'could not JSON parse the nlp parsing for "' + text + '"'};
        }
        callback(b);
      });
    }
    return true;
  }
};

module.exports = nlp;

function JSONtoString(data){
  if (data.words === null ){
    return;
  }
  else{
    var i;
    var output = "";
    for (i in data.words){
      output = output + data.words[i].value + "/" + data.words[i].tag + " ";
    }
    return output;
  }
}

function ParseJSON(data){
  if (data.words === null ){
    return;
  }
  var nouns = [];
  var verbs = [];
  var adjectives = [];
  var counts = [];
  var i;
  for(i in data.words){
    if(data.words[i].tag.match(/NN[a-zA-Z]{0,2}/) || data.words[i].tag.match(/WHNP/)){
      nouns.push(data.words[i]);
    } else if(data.words[i].tag.match(/VB[a-zA-Z]{0,1}/)){
      verbs.push(data.words[i]);
    } else if(data.words[i].tag.match(/JJ[a-zA-Z]{0,1}/)){
      adjectives.push(data.words[i]);
    } else if(data.words[i].tag.match(/CD/)){
      counts.push(data.words[i]);
    }
  }
  return {
    nouns: nouns,
    verbs: verbs,
    adj: adjectives,
    counts: counts
  };
}
