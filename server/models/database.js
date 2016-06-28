var pg = require('pg');
var path = require('path');
var connectionString = require(path.join(__dirname, '../', '../', 'config'));

var client = new pg.Client(connectionString);
client.connect();
var query = client.query('CREATE TABLE users(userID int PRIMARY KEY, saltMaster varchar(255) not null, privKeyEnc varchar(4096) not null, pubKey VARCHAR(2048) not null);' +
    'CREATE TABLE messages(messageID Serial PRIMARY KEY, sourceUserID int not null, targetUserID int not null, cipher text, iv varchar(255) not null, keyRecEnc varchar(2048) not null, sigRec varchar(2048) not null);');
query.on('end', function() { client.end(); });