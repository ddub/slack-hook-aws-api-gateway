var AWS = require('aws-sdk'),
     fs = require('fs'),
      q = require('q');
/*
   takes the post property which is passed by the input mapping as a js encoded
   post body.

   for example the following was the post data from the slack webhook

token=RtZqUqU6ycRQ6rdjcc2SGUBl&team_id=T0001&team_domain=example&channel_id=C2147483705&channel_name=test&timestamp=1355517523.000005&user_id=U2147483697&user_name=Steve&text=googlebot%3A+What+is+the+air-speed+velocity+of+an+unladen+swallow?&trigger_word=googlebot%3A
    
    the input mapping turns it into:
{
  "post": "token=RtZqUqU6ycRQ6rdjcc2SGUBl&team_id=T0001&team_domain=example&channel_id=C2147483705&channel_name=test&timestamp=1355517523.000005&user_id=U2147483697&user_name=Steve&text=googlebot%3A+What+is+the+air-speed+velocity+of+an+unladen+swallow?&trigger_word=googlebot%3A"
}
    this method returns;
    
{
    "token": "RtZqUqU6ycRQ6rdjcc2SGUBl",
    "team_id": "T0001",
    "team_domain": "example",
    "channel_id": "C2147483705",
    "channel_name": "test",
    "timestamp": "1355517523.000005",
    "user_id": "U2147483697",
    "user_name": "Steve",
    "text": "googlebot: What is the air-speed velocity of an unladen swallow?",
    "trigger_word": "googlebot:" }
*/
function decompose_post(post) {
  obj = {};
  params = post.split(/[&\n]/);
  for (var i = 0; i < params.length; i++)
  {
    kv = params[i].split('=');
    obj[decodeURIComponent(kv[0])]=decodeURIComponent(kv[1].replace('+', ' '));
  }
  return obj;
}

function load_token() {
  var deferred = q.defer();
  var kms = new AWS.KMS();
  var encrypted_file = './slack-token';
  fs.stat(encrypted_file, function(err, file_info) {
    if (err != null) {
      deferred.reject('No encrypted file:'+err.code)
      return deferred.promise;
    }
    var encrypted = fs.readFileSync(encrypted_file);
    if (encrypted === undefined || encrypted == '') {
      deferred.reject('No encrypted token')
      return deferred.promise;
    }
    kms.decrypt({
      CiphertextBlob: encrypted
    }, function(err, data) {
      if (err) deferred.reject(err.stack);
      else {
        deferred.resolve(data['Plaintext'].toString());
      }
    });
  });
  return deferred.promise;
}

var wrange_message = function(event, context, callback) {
  if (!('post' in event)) context.fail('No message?');
  trigger = decompose_post(event.post);
  load_token().then(function(token) {
    console.log('trigger is '+trigger.token);
    console.log('tri is '+token);
    if (token != trigger.token) {
      context.fail('Auth fail');
    } else {
      callback(trigger, context);
    }
  })
};

module.exports = wrange_message
