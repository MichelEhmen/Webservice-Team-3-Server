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

