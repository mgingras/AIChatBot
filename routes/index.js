var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* POST message. */
router.post('/msg', function(req, res, next) {
  if(req.body && req.body.msg){
    var msg = req.body.msg;
    console.log(msg);
    res.send(msg + 'er');
  }
});

module.exports = router;
