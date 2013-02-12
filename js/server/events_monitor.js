"use strict"

//* Gets data parsed from sensors and check if it's associated to a real event
//* from the database

var db;
var eventTypeId;
var data;
var eventToSend;
var idTimer;
var tasks_executor = require("./tasks_executor.js");
var shared_data = require("./shared_data.js");
var sensors_utils = require('./sensors.js');
var fs = require("fs");
var events = require('events');
// Map with last values of each sensor {id : value, ...}
var lastValues;
var SENSOR_EVENT = "newSensorEvent";
var eventEmitter = new events.EventEmitter();
var tables = shared_data.get_shared_data('SQL_TABLES');

Date.prototype.getWeek = function() {
	var onejan = new Date(this.getFullYear(),0,1);
	return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
} 


function checkThresholds(idSensor, sensor_type_id, value) {
	//console.log("ERROR WITH "+ lastValues);
	db.select_query("SELECT th.value " +
					"FROM `" +  tables['th'] + "` th " +
					"INNER JOIN `"+ tables['thst'] + "` thst ON (thst.threshold_id = th.id) " +
					"WHERE thst.sensor_type_id = ?",
	[sensor_type_id], 
	function(err, rows) {
		var thresholds = [];
		for (var r in rows) {
			thresholds.push(rows[r]["th.value"]);
		}

		for(var t in thresholds) {
			var threshold = thresholds[t]
			if (lastValues[idSensor] < threshold && value > threshold) {
				//tasks_executor.execute_task(1);
				eventEmitter.emit(SENSOR_EVENT, 1, idSensor);
			}
			if (lastValues[idSensor] > threshold && value < threshold) {
				//tasks_executor.execute_task(2);
				eventEmitter.emit(SENSOR_EVENT, 2, idSensor);
			}
		}
		//console.log("ERROR WITH "+ value);
		lastValues[idSensor] = value;
	});
}


function tempEvent(idSensor, sensor_type_id, value) {
	checkThresholds(idSensor, sensor_type_id, value);
}
function lumEvent(idSensor, sensor_type_id, value) {
	checkThresholds(idSensor, sensor_type_id, value);
}
function contEvent(idSensor, sensor_type_id, value) {
	// Contact performed
	if(value == 1) {
		eventEmitter.emit(SENSOR_EVENT, 3, idSensor);
	}

	// Contact removed
	if(value == 0) {
		eventEmitter.emit(SENSOR_EVENT, 4, idSensor);
	}

	lastValues[idSensor] = value;

}
function preEvent(idSensor, sensor_type_id, value) {
	// Occupancy PIR ON
	if (value == 0) {
		//tasks_executor.execute_task(10);
		eventEmitter.emit(SENSOR_EVENT, 10, idSensor);
	}
	// Occupancy PIR OFF
	if (value == 1) {
		//tasks_executor.execute_task(11);
		eventEmitter.emit(SENSOR_EVENT, 11, idSensor);
	}

	lastValues[idSensor] = value;
}

function switchEvent(idSensor, sensor_type_id, value) {
	console.log("VALUE SWITCH :", value)
	switch(value) {

		case 1:
		// Bouton interr droit haut
		eventEmitter.emit(SENSOR_EVENT, 14, idSensor)
		break

		case 2:
		// Bouton interr droit bas
		eventEmitter.emit(SENSOR_EVENT, 15, idSensor)
		break

		case 3:
		// Bouton interr gauche haut
		eventEmitter.emit(SENSOR_EVENT, 12, idSensor)
		break

		case 4:
		// Bouton interr gauche bas
		eventEmitter.emit(SENSOR_EVENT, 13, idSensor)
		break

		default:
		break
	}
}

var dictSensorEvent = { 1 : tempEvent,
	2 : lumEvent,
	4 : contEvent,
	3 : preEvent,
	8 : switchEvent
	};

function sendTimeEvent() {
	var currentTime = new Date();
	//console.log("Minute changed = " + currentTime.getMinutes());
	//db.query("SELECT id FROM event_types WHERE name = ?", "minute", sendEvent);
	var lastExecutionStr = null;
	var previousTime = null;
	if (fs.existsSync("lastExecutionTimer.txt")) {
	 lastExecutionStr = fs.readFileSync("lastExecutionTimer.txt", "utf8");
	 previousTime = new Date(lastExecutionStr);
	}
	//tasks_executor.execute_task(7);

	// Year or month has changed
	if (previousTime == null || currentTime.getFullYear() != previousTime.getFullYear() || currentTime.getMonth() != previousTime.getMonth()) {
		// All events
		eventEmitter.emit(SENSOR_EVENT, 9, -1)
		eventEmitter.emit(SENSOR_EVENT, 8, -1)
		eventEmitter.emit(SENSOR_EVENT, 7, -1)
		eventEmitter.emit(SENSOR_EVENT, 6, -1)
		eventEmitter.emit(SENSOR_EVENT, 5, -1)
		/*tasks_executor.execute_task(9);
		tasks_executor.execute_task(8);
		tasks_executor.execute_task(5);
		tasks_executor.execute_task(6);
		tasks_executor.execute_task(7);*/

	}
	// Week has changed
	else if (currentTime.getWeek() != previousTime.getWeek()) {
		/*tasks_executor.execute_task(8);
		tasks_executor.execute_task(5);
		tasks_executor.execute_task(6);
		tasks_executor.execute_task(7);*/
		eventEmitter.emit(SENSOR_EVENT, 5, -1)
		eventEmitter.emit(SENSOR_EVENT, 8, -1)
		eventEmitter.emit(SENSOR_EVENT, 7, -1)
		eventEmitter.emit(SENSOR_EVENT, 6, -1)
	}
	// Day has changed
	else if (currentTime.getDay() != previousTime.getDay()) {
		/*tasks_executor.execute_task(5);
		tasks_executor.execute_task(6);
		tasks_executor.execute_task(7);*/
		eventEmitter.emit(SENSOR_EVENT, 5, -1)
		eventEmitter.emit(SENSOR_EVENT, 6, -1)
		eventEmitter.emit(SENSOR_EVENT, 7, -1)
	}
	// Hour has changed
	else if (currentTime.getHours() != previousTime.getHours()) {
		/*tasks_executor.execute_task(6);
		tasks_executor.execute_task(7);*/
		eventEmitter.emit(SENSOR_EVENT, 6, -1)
		eventEmitter.emit(SENSOR_EVENT, 7, -1)
	}
	// Minute has changed
	else if (currentTime.getMinutes() != previousTime.getMinutes()) {
		//tasks_executor.execute_task(7);
		eventEmitter.emit(SENSOR_EVENT, 7, -1)
	}
/*
	// Hour changed
	if (currentTime.getHours() != previousTime.getHours()) {
		console.log("Hour changed = " + currentTime.getHours());
		tasks_executor.execute_task(6);
	}
	// Day changed
	if (currentTime.getDay() != previousTime.getDay()) {
		console.log("Day changed = " + currentTime.getDay());
		tasks_executor.execute_task(5);
	}
	// Week changed
	if (currentTime.getDay() == 1 previousTime.getDay() == 0) {
		console.log("Week changed");
		tasks_executor.execute_task(8);


	}
	// Month changed
	if (currentTime.getMonth() != previousTime.getMonth() || currentTime.getFullYear() != previousTime.getFullYear()) {
		console.log("Month changed");
		tasks_executor.execute_task(9);
	}

			
*/
	// Save date of last execution
	var fileLastExecution = fs.openSync("lastExecutionTimer.txt", "w");
	fs.writeSync(fileLastExecution, currentTime.toLocaleString(), 0);
	fs.closeSync(fileLastExecution);

}


function start(database) {
	console.log("EM_Starting events_monitor");
	lastValues = shared_data.get_shared_data("SENSORS_VALUES");
	db = database;
	//getData(2214883, 10);
	//getData(2214883, 10);
	idTimer = setInterval(sendTimeEvent, 15000);
}

function handleEvent(frame_data) {
	console.log("EM_Data received from : " + frame_data.id);
	console.log("EM_Data : " + frame_data.data);

	db.select_query("SELECT id AS sensor_id, sensor_type_id FROM `"+ tables['s'] +"` WHERE hardware_id = ?", [frame_data.id], function(err, rows) {

	// For every type of the sensor (a sensor can have many types)

		 for (var r in rows) {
			//console.log(rows[r]["sensors_types.name"]);
			//var sensor_type = rows[r]["sensors_types.name"];
			//var sensor_type_id = rows[r]["sensors_types.id"];
			// If sensor_type_id is associated with a function in dictSensorEvent
			var type = rows[r].sensor_type_id
			var value = sensors_utils.decode_data_byte(type, frame_data)
			var sensor_id = rows[r].sensor_id
			 console.log("EM_TYPE SENSOR : " + type);
			 console.log("EM_VALUE_SENSOR : " + value);
			if (type in dictSensorEvent) {
				console.log("EM_SEND EVENT")
				dictSensorEvent[type](sensor_id, type, value);
			}
	  	}



	});
}

exports.start = start;
exports.handleEvent = handleEvent;
exports.events = eventEmitter;
exports.SENSOR_EVENT = SENSOR_EVENT;
