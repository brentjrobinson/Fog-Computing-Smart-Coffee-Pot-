const fs = require('fs');
const exec = require('child_process').exec;
const fetch = require('node-fetch');
const Gpio = require('pigpio').Gpio;
var express = require('express');
var app = express();
var router = express.Router();
var path = require('path');
var moment = require('moment');
var moment = require('moment-timezone');
var path = __dirname +"/public/";
//yet another gpio library
var rpio = require('rpio');

 
/* Constants */
const   relay = 40;
const HIGH = 1, LOW = 0;
const brewingTemp = 72;
const brewedTemp = 100;
//const brewOffset = 10000;
const brewOffset = 45 * 60000;
const filePath = '/sys/bus/w1/devices/28-000008c5b963/w1_slave';
var lastBrewed = null;
var elapsedDuration = "";
rpio.open(relay, rpio.OUTPUT, rpio.HIGH);
function getStatus(){
	return rpio.read(relay);
 }
router.use(function (req,res,next) {
  console.log("/" + req.method);
  next();
});
router.get("/",function(req,res){
  
  if(getStatus() === 1){
  res.sendFile("/home/pi/Desktop/SmartCoffeeProject/public/off.html");
  }
  if(getStatus() === 0){
	  res.sendFile("/home/pi/Desktop/SmartCoffeeProject/public/on.html");
  
  }
});

app.use("/",router);

const slackMessage = {
    "username": "Coffee Bot v2.0",
	"text": "🚨 Coffee has been freshly brewed! Get it before it's gone!!!"
}
const slackHook = 'https://hooks.slack.com/services/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';
/*********/
app.get('/turnOn/', function(req, res){ 
	rpio.open(relay, rpio.OUTPUT, rpio.LOW);
	res.sendFile("/home/pi/Desktop/SmartCoffeeProject/public/on.html");
 });

 app.get('/turnOff', function(req, res){ 
	//lastBrewed = null;
	rpio.open(relay, rpio.OUTPUT, rpio.HIGH);
	res.sendFile("/home/pi/Desktop/SmartCoffeeProject/public/off.html");
});
 
 app.get('/status', function (req, res) {
		
					var statusPot = {
			coffeeStatus: getStatus(),
			timestamp: Date.now()
					  };
			res.send(JSON.stringify(statusPot));
		});
		
		
app.listen(3000, function () {
    console.log('Shhhhh. Coffee pot listening on port 3000!');
});

const readFile = path => new Promise((resolve, reject) => {
    fs.readFile(path, (err, file) => {
        if (err) {
            return reject(err);
        }
        return resolve(file);
    });
});

const getTempFromFile = file => {
    return file.slice(file.indexOf('t=') + 2) / 1000;
}

const toF = temp => temp * 1.8 + 32;

const isCoffeeReady = (temp) => {  
    if (temp > brewedTemp) {
        //if (period > 2) {
            return true
        //}
    }

    if (temp > brewingTemp) {
        return 'Currently brewing, almost there...';
    }      

    return false
}

let state = {
	//period: 0,
	lastBrew: 0
}

//credit to Caleb Brewer for wiring diragram

"use strict";
let inter = () => {
    setInterval(() => {
        if(state.lastBrew + brewOffset <= Date.now()) {
            readFile(filePath)
            .then(file => {
                const temp = toF(getTempFromFile(file));
                const ready = isCoffeeReady(temp);

                if (ready === true && getStatus() === 0) {
                    //state.period = 0;
                   if (lastBrewed === null){
						lastBrewed = moment();
				   }
					state.lastBrew = Date.now();
					console.log(lastBrewed);
                    //outputPort.digitalWrite(state.outputPort);
                    fetch(slackHook, { method: 'POST', body: JSON.stringify(slackMessage) });
                                        console.log('ready', temp);
					console.log(state.lastBrew);
                }
                else if (ready === 'Currently brewing, almost there...' && getStatus() === 0) {
                    console.log('almost', temp);                   
                }
                else if (getStatus() === 1){
                    console.log('Not brewing, the pot is off!', temp);
                }
            })
            .catch(err => {
                console.log(err);
            });
        }
        else {
            console.log("Coffee just finished brewing, might want to wait a little bit");
        }
    }, 10000);
}
	
	
function tempRequest(){			
app.get('/api/temperature', function (req, res) {
		 
		 elapsedDuration = moment.duration(moment().diff(lastBrewed)).asMinutes();
		 readFile(filePath)
            .then(file => {
					var tempReq = {
			temperature:toF(getTempFromFile(file)),
			lastBrew: lastBrewed, lastBrew: elapsedDuration.toFixed(2)
			
					  };
			res.send(JSON.stringify(tempReq));
		});
			})
		
}

router.get('/api/lastBrew', function(req, res) {
	elapsedDuration = moment.duration(moment().diff(lastBrewed)).asMinutes();
		if (lastBrewed){
   var last = ({ exactBrewTime: lastBrewed, lastBrew: elapsedDuration.toFixed(2) });  
	res.send(JSON.stringify(last));
		}
});

setInterval(tempRequest, 600);
exec('modprobe w1-gpio && modprobe w1-therm', (err, stdout, stderr) => {
    if (err) {
        console.log(`Couldn't run exec`);
        return;
    }
//    outputPort.digitalWrite(state.outputPort)
    inter();
});


