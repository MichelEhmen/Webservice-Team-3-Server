/**
 * Created by michelehmen on 08.06.16.
 */
var NodeRSA = require('node-rsa');
var key = new NodeRSA({b: 512});

var text = 'Hello RSA!';
var encrypted = key.encrypt(text, 'base64');
console.log('encrypted: ', encrypted);
var decrypted = key.decrypt(encrypted, 'utf8');
console.log('decrypted: ', decrypted);

var myDate = new Date()

var myDate2 = new Date()
myDate2.setMinutes(myDate.getMinutes()-5);

console.log(myDate);
console.log(myDate2);
console.log(myDate-myDate2);

function test(wahr){
    if(wahr) {
        return true;
        console.log("weiter");
    }

}

if(test(true)){
    console.log("blaaa")
}

console.log(test(true));

var ursa = require('ursa');
var fs = require('fs');

// create a pair of keys (a private key contains both keys...)
var keys = ursa.generatePrivateKey();
console.log('keys:', keys);
console.log('=====================================================');
// reconstitute the private key from a base64 encoding
var privPem = keys.toPrivatePem('base64');
console.log('privPem:', privPem);
console.log('=====================================================');
var priv = ursa.createPrivateKey(privPem, '', 'base64');

// make a public key, to be used for encryption
var pubPem = keys.toPublicPem('base64');
console.log('pubPem:', pubPem);
console.log('=====================================================');
var pub = ursa.createPublicKey(pubPem, 'base64');

// encrypt, with the private key, then decrypt with the public
var data = 'hello world';
console.log('data:', data);
console.log('=====================================================');
var enc = pub.encrypt(data);
console.log('enc:', enc.toString());
console.log('=====================================================');
var unenc = priv.decrypt(enc);
console.log('unenc:', unenc.toString());
