var express = require('express');
var router = express.Router();
var path = require('path');
var pg = require('pg');
var connectionString = require(path.join(__dirname, '../', '../', 'config'));
var NodeRSA = require('node-rsa');

//Nachrichtenprüfung
//Prüfung des Nachrichtenabrufs
function authentication(pubKeyUser, sigService, time){

    var pubKey = new NodeRSA("-----BEGIN PUBLIC KEY-----\n"+pubKeyUser+"\n-----END PUBLIC KEY-----");
    console.log(pubKey.isPublic());
    try{
        pubKey.decryptPublic(sigService);
        console.log("Der Key ist valide")
    } catch(ex){
        console.log(ex);
        return false;
    }
    var timeDiff = Math.round(Date.now()/1000);
    console.log(time);
    console.log(timeDiff);
    timeDiff = timeDiff-time;
    if(timeDiff<300000){
        return true;
    }
    console.log("Zeitdifferenz liegt über 5 Minuten");
    return false;
}



//Registrierung eines Users
router.post('/:user_id', function(req, res) {

    var data = {saltMaster: req.body.saltMaster, privKeyEnc: req.body.privKeyEnc, pubKey: req.body.pubKey};
    var id = req.params.user_id;

    //Postgres-Verbindung
    pg.connect(connectionString, function(err, client, done) {
        // Behandlung von Verbindungsfehlern
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }

        //SQL Query > Insert Data
        var query = client.query("INSERT INTO users(userID, saltMaster, privKeyEnc, pubKey) values($1, $2, $3, $4);", [id, data.saltMaster, data.privKeyEnc, data.pubKey]);

        //Nachdem die Daten erfolgreich persistiert wurden, wird der Status 201 zurückgegeben
        query.on('end', function() {
            done();
            return res.status(201).json();
        });

        //Bei einem Fehler beim Import in die Datenbank wird der Status 409 zurückgegeben
        query.on('error', function(err) {
            console.log(err);
            console.log(req.body);
            done();
            return res.status(409).json({success: false, data: err});
        });

    });
});

//Login eines Users
router.get('/:user_id', function(req, res) {

    console.log("opened route.");
    var result;
    var id = req.params.user_id

    //Postgres-Verbindung
    pg.connect(connectionString, function(err, client, done) {
        //Behandlung von Verbindungsfehlern
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }

        //SQL Query > Select Data
        var query = client.query("SELECT saltmaster, pubkey, privkeyenc FROM users where userid=($1);", [id]);


        query.on('row', function(row) {
            result = row;
        });

        //Nachdem alle Daten empfangen wurden, wird die Verbindung geschlossen und die Daten zurückgegeben.
        query.on('end', function() {
            done();
            return res.json(result);
        });

        //Bei einem Fehler beim Import in die Datenbank wird der Status 409 zurückgegeben
        query.on('error', function(err) {
            console.log(err);
            console.log(req.body);
            done();
            return res.status(409).json({success: false, data: err});
        });

    });

});

//Verschicken einer Nachricht
router.post('/:user_id/message', function(req, res){
    var results = [];


    var umschlagInnen = {sourceUserID: req.params.user_id, cipher: req.body.cipher,iv: req.body.iv, keyRecEnc: req.body.keyRecEnc, sigRec: req.body.sigRec};
    var umschlagAussen = {targetUserID: req.body.targetUserID, sigService: req.body.sigService, time: req.body.timestamp, umschlag: umschlagInnen};

    //Postgres-Verbindung
    pg.connect(connectionString, function(err, client, done) {

        //Behandlung von Verbindungsfehlern
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }

        //Nachrichtenprüfung
        var query1 = client.query("SELECT * FROM users where userid=($1) ORDER BY userid ASC;", [umschlagInnen.sourceUserID]);

        query1.on('row', function(row) {
            //Mit dem PublicKey wird die geforderte Überprüfung durchgeführt.
            if(!authentication(row.pubkey, umschlagAussen.sigService, umschlagAussen.time)){
                done();
                return res.status(500).json({ success: false, data: err});
            }
        });

        console.log("Validierung durchgelaufen");

        //Nachrichtenweiterleitung
        var query2 = client.query("INSERT INTO messages(sourceUserID, targetUserID, cipher, iv, keyRecEnc, sigRec) values($1, $2, $3, $4, $5, $6)", [umschlagInnen.sourceUserID, umschlagAussen.targetUserID, umschlagInnen.cipher, umschlagInnen.iv, umschlagInnen.keyRecEnc, umschlagInnen.sigRec]);

        //Nachdem alle Daten persistiert wurden, wird die Verbindung geschlossen.
        query2.on('end', function() {
            done();
            return res.status(200).json();
        });

        //Bei einem Fehler beim Import in die Datenbank wird der Status 409 zurückgegeben
        query2.on('error', function(err) {
            console.log(err);
            console.log(req.body);
            done();
            return res.status(409).json({success: false, data: err});
        });

    });
});

//Anzeigen aller Nachrichten
router.post('/:user_id/messages', function(req, res) { //Post ?

    var results = [];
    var id = req.params.user_id;
    var time = req.body.timeStamp;
    var sigService = req.body.sigService;

    pg.connect(connectionString, function(err, client, done) {
        //Behandlung von Verbindungsfehlern
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }

        var query1 = client.query('SELECT * FROM users where userID = $1 ', [id]);

        query1.on('row', function (row) {
            if(!authentication(row.pubkey, sigService, time)){
                done();
                return res.status(500).json({ success: false, data: err});
            }
        });


        // SQL Query > Select Data
        var query = client.query("SELECT sigrec, sourceuserid, iv, cipher, keyrecenc FROM messages where messages.targetUserID=($1) ORDER BY messageID ASC;", [id]);

        //Die Nachrichten werden als Json-Objekte in Json-Array geladen.
        query.on('row', function(row) {
            results.push(row);
        });

        //Nachdem alle Daten empfangen wurden, wird die Verbindung geschlossen und die Daten zurückgegeben.
        query.on('end', function() {
            done();
            return res.json(results);
        });

        //Bei einem Fehler beim Import in die Datenbank wird der Status 409 zurückgegeben
        query.on('error', function (err) {
            console.log(err);
            console.log(req.body);
            done();
            return res.status(409).json({success: false, data: err});
        });

    });

});


//Benutzer löschen
router.delete('/:user_id', function(req, res) {

    var id = req.params.user_id;

    pg.connect(connectionString, function(err, client, done) {
        //Behandlung von Verbindungsfehlern
        if(err) {
            done();
            console.log(err);
            return res.status(500).json({ success: false, data: err});
        }

        // SQL Query > Delete Data
        client.query("DELETE FROM users WHERE userid=($1)", [id]);

        // SQL Query > Select Data
        var query = client.query("SELECT * FROM users ORDER BY id ASC");

        //Nachdem die Daten gelöscht wurden, wird die Verbindung geschlossen und der Status zurückgegeben.
        query.on('end', function() {
            done();
            return res.status(200).json();
        });

        query.on('error', function (err) {
            console.log(err);
            done();
            return res.status(409).json({success: false, data: err});
        });
    });

});

//Nachricht löschen
router.delete('/:user_id/:message_id', function(req, res) {

    // Grab data from the URL parameters
    var userID = req.params.user_id;
    var messageID = req.params.message_id;

    //Behandlung von Verbindungsfehlern
    if(err) {
        done();
        console.log(err);
        return res.status(500).json({ success: false, data: err});
    }

    pg.connect(connectionString, function(err, client, done) {

        // SQL Query > Delete Data
        client.query("DELETE FROM messages WHERE messageid=($1) and targetuserid=($2)", [messageID, userID]);

        //Nachdem die Daten gelöscht wurden, wird die Verbindung geschlossen und der Status zurückgegeben.
        query.on('end', function() {
            done();
            return res.status(200).json();
        });

        //Bei einem Fehler beim Import in die Datenbank wird der Status 409 zurückgegeben
        query.on('error', function (err) {
            console.log(err);
            done();
            return res.status(409).json({success: false, data: err});
        });
    });

});


module.exports = router;