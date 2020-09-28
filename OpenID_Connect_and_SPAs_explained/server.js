var http = require('http');

http.createServer(function (req) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    console.log(body);
  });

}).listen(8080);