var express = require('express');
var router = express.Router();
var path = require('path');
var pg = require('pg');
var connectionString = require(path.join(__dirname, '../', '../', 'config'));
var NodeRSA = require('node-rsa');


function authentication(pubKeyUser, sigService, time){
    var key = new NodeRSA('-----BEGIN PUBLIC KEY-----\n'+
        pubKeyUser+
        '\n-----END PUBLIC KEY-----');
    results = [];
    try{
        key.decrypt(sigService, 'utf8');
    } catch(ex){
        console.log(ex);
        return false;
    }
    var timeDiff = new Date();
    timeDiff = timeDiff-time;
    if(timeDiff<300000){
        return true;
    }
    console.log("Zeitdifferenz liegt über 5 Minuten");
    return false;
}



//Registrierung eines Users
router.post('/:user_id', function(req, res) {

    var results = [];

    // Grab data from http request
    var data = {saltMaster: req.body.saltMaster, privKeyEnc: req.body.privKeyEnc, pubKey: req.body.pubKey};
    var id = req.params.user_id;

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }
        
        // SQL Query > Insert Data
        client.query("INSERT INTO users(userID, saltMaster, privKeyEnc, pubKey) values($1, $2, $3, $4)", [id, data.saltMaster, data.privKeyEnc, data.pubKey]);

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM users ORDER BY userID ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.status(201).json();
        });

        query.on('error', function(err) {
            done();
            return res.status(409).json({success: false, data: err});
        });

    });
});

//Login eines Users
router.get('/:user_id', function(req, res) {

    var results = [];
    var id = req.params.user_id

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM users where userid=($1) ORDER BY userid ASC;", [id]);

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.json(results);
        });

    });

});

//schicke Nachricht
router.post('/:user_id/message', function(req, res){
    var results = [];

    // Grab data from the URL parameters
    //var id = req.params.todo_id;

    // Grab data from http request
    var umschlagInnen = {sourceUserID: req.params.user_id, cipher: req.body.cipher,iv: req.body.iv, keyRecEnc: req.body.keyRecEnc, sigRec: req.body.sigRec};
    var umschlagAussen = {targetUserID: req.body.targetUserID, sigService: req.body.sigService, time: req.body.timestamp, umschlag: umschlagInnen};

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }


        //Nachrichtenprüfung
        client.query('SELECT pubKey as "pubKeyUser" FROM users where userID = $1 ', [umschlagInnen.sourceUserID]);


        if(!authentication(results.rows[0].pubKeyUser, umschlagAussen.sigService, umschlagAussen.time)){
            done();
            return res.status(500).json({ success: false, data: err});
        }
        results = [];

        console.log("Validierung durchgelaufen");
        //Nachrichtenweiterleitung
        // SQL Query > Insert Data
        client.query("INSERT INTO messages(sourceUserID, targetUserID, cipher, iv, keyRecEnc, sigRec) values($1, $2, $3, $4, $5, $6)", [umschlagInnen.sourceUserID, umschlagAussen.targetUserID, umschlagInnen.cipher, umschlagInnen.iv, umschlagInnen.keyRecEnc, umschlagInnen.sigRec]);

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM messages ORDER BY sourceUserID ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.json(results);
        });


    });
});

//Anzeigen aller Nachrichten
router.get('/:user_id/message', function(req, res) { //Post ?

    var results = [];
    var id = req.params.user_id;
    var time = req.body.timestamp;
    var sigService = req.body.sigService;

    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }

        //client.query('SELECT pubKey as "pubKeyUser" FROM users where userID = $1 ', [id]);


        //if(!authentication(results.rows[0].pubKeyUser, sigService, time)){
         //   done();
          //  return res.status(500).json({ success: false, data: err});
        //}
        //results = [];

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM messages where targetUserID=($1) ORDER BY messageID ASC;", [id]);

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.json(results);
        });

    });

});

//User löschen
router.delete('/:user_id', function(req, res) {

    var results = [];

    // Grab data from the URL parameters
    var id = req.params.user_id;


    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Delete Data
        client.query("DELETE FROM users WHERE userid=($1)", [id]);

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM users ORDER BY id ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.json(results);
        });
    });

});

//Nachricht löschen
router.delete('/:user_id/:message_id', function(req, res) {

    var results = [];

    // Grab data from the URL parameters
    var tagertUserID = req.params.targetUser_id;
    var messageID = req.params.message_id;


    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }
    
        // SQL Query > Delete Data
        client.query("DELETE FROM messages WHERE messageID=($1) and targetUserID=($2)", [messageID, targetUserID]);

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM messages ORDER BY targetUserID ASC");

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done();
            return res.json(results);
        });
    });

});


module.exports = router;