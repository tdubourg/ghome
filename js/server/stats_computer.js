var db ;

var tpl = require('./template_engine')
var shared = require('./shared_data')
var SQL_TABLES_DIC = shared.get_shared_data('SQL_TABLES');




function statsRH(req, res, params, responseSender){
		var templateData = {
		// 'IN_TEMP'		       : shared.get_shared_data('IN_TEMP')
		// , 'OUT_TEMP'	     : shared.get_shared_data('OUT_TEMP')
		// , 'TEST_DATA'		 : params.postData
		// , 'COLOR_TEMP_IN'  : temp2color(shared.get_shared_data('IN_TEMP'))
		// , 'COLOR_TEMP_OUT' : temp2color(shared.get_shared_data('OUT_TEMP'))
		
		}


	var data = tpl.get_template_result("stats.html", templateData)
	console.log(params['pathname'])
	params['fileUrl'] = 'stats.html'
	responseSender(req, res, params, data)
}



/**
 *Function that computes the average of temperature each hour and writes the result in the table hour_stats
 *it will be called at the begining of every hour
 *@param
 *@returns
*/
 function temperature_h ( ) {
 	var date = new Date();
	var previous_hour = date.getHours() - 1;
	//insert the average of temperature of the previous hour in the table hour_stats
	var query_str = "insert into hour_stats (sensor_type_id,value,time)"+
				"Select  sensors_types.id, avg(logs.value),  strftime('%Y-%m-%d %H:00:00', logs.time)"+
				"from logs,sensors_types,sensors"+
				"where sensors.sensor_type_id = sensors_types.id and "+
				"sensors.sensor_type_id = logs.sensor_id and sensors_types.id = 1 and"+
				"(strftime('%H',logs.time) = ?) and strftime('%Y-%m-%d', logs.time) = date('now');"
	db.query (query_str, [previous_hour],NULL)
 }


/**
 *Function that computes the sum of electric consumption each hour and writes the result in the table hour_stats
 *it will be called at the begining of every hour
 *@param
 *@returns
*/
 function consumption_h ( ) {
 	var date = new Date();
	var previous_hour = date.getHours() - 1;
	//insert the average of temperature of the previous hour in the table hour_stats
	var query_str = "insert into hour_stats (sensor_type_id,value,time)"+
				"Select  sensors_types.id, sum(logs.value),  strftime('%Y-%m-%d %H:00:00', logs.time)"+
				"from logs,sensors_types,sensors"+
				"where sensors.sensor_type_id = sensors_types.id and "+
				"sensors.sensor_type_id = logs.sensor_id and sensors_types.id = 5 and"+
				"(strftime('%H',logs.time) = ?) and strftime('%Y-%m-%d', logs.time) = date('now');"
	db.query (query_str, [previous_hour],NULL)
 }

 /**
 *Function that computes the average of temperature each day and writes the result in the table daily_stats
 *it will be called at the begining of everyday
 *@param
 *@returns
*/
 function temperature_d ( ) {
 	
	//insert the average of temperature of the previous day in the table daily_stats
	var query_str = "insert into daily_stats (sensor_type_id,value,time)"+
				"Select  sensors_types.id, avg(hour_stats.value),  strftime('%Y-%m-%d', hour_stats.time)"+
				"from hour_stats,sensors_types,sensors"+
				"where sensors.sensor_type_id = sensors_types.id and "+
				"sensors.sensor_type_id = hour_stats.sensor_type_id and sensors_types.id = 1 and"+
				"strftime('%Y-%m-%d', hour_stats.time) =  strftime('%Y-%m-%d','now', '-1 day');"
	db.query (query_str, NULL,NULL)
 }


/**
 *Function that computes the sum of electric consumption each day and writes the result in the table daily_stats
 *it will be called at the begining of everyday
 *@param
 *@returns
*/
 function consumption_d ( ) {
 	
	//insert the average of temperature of the previous day in the table daily_stats
	var query_str = "insert into daily_stats (sensor_type_id,value,time)"+
				"Select  sensors_types.id, sum(hour_stats.value),  strftime('%Y-%m-%d', hour_stats.time)"+
				"from hour_stats,sensors_types,sensors"+
				"where sensors.sensor_type_id = sensors_types.id and "+
				"sensors.sensor_type_id = hour_stats.sensor_type_id and sensors_types.id = 5 and"+
				"strftime('%Y-%m-%d', hour_stats.time) =  strftime('%Y-%m-%d','now', '-1 day');"
	db.query (query_str, NULL,NULL)
 }

  /**
 *Function that computess the average of temperature each day and writes the result in the table monthly_stats
 *it will be called at the begining of the month
 *@param
 *@returns
*/
 function temperature_m ( ) {
 	
	//insert the average of temperature of the previous month in the table monthly_stats
	var query_str = "insert into monthly_stats (sensor_type_id,value,time)"+
				"Select  sensors_types.id, avg(daily_stats.value),  strftime('%Y-%m-%d', daily_stats.time,'start of month')"+
				"from daily_stats,sensors_types,sensors"+
				"where sensors.sensor_type_id = sensors_types.id and "+
				"sensors.sensor_type_id = daily_stats.sensor_type_id and sensors_types.id = 1 and"+
				"strftime('%Y-%m-%d', daily_stats.day) =  strftime('%Y-%m-%d','now', '-1 day');"
	db.query (query_str, NULL,NULL)
 }


/**
 *Function that computess the sum of electric consumption each month and writes the result in the table monthly_stats
 *it will be called at the begining of the month
 *@param
 *@returns
*/
 function consumption_m ( ) {
 	
	//insert the average of temperature of the previous month in the table monthly_stats
	var query_str = "insert into monthly_stats (sensor_type_id,value,time)"+
				"Select  sensors_types.id, sum(daily_stats.value),  strftime('%Y-%m-%d', daily_stats.time,'start of month')"+
				"from daily_stats,sensors_types,sensors"+
				"where sensors.sensor_type_id = sensors_types.id and "+
				"sensors.sensor_type_id = daily_stats.sensor_type_id and sensors_types.id = 5 and"+
				"strftime('%Y-%m-%d', daily_stats.day) =  strftime('%Y-%m-%d','now', '-1 day');"
	db.query (query_str, NULL,NULL)
 }


/**
 * Gets stats from hour_stats for a certain type of sensor in [date1,date2]
 * dates must be in the following format : YYYY-MM-DD HH:MM:SS
 *@params {string} type_stats, type_sensor, date1, date2
 * 					type_stats can be {hour_stats,daily_stats,monthly_}
 *@returns
*/
 function get_stats (type_stats,type_sensor, date1, date2) {
 	var query_str = " select time, value "+
					"from ?"+
					"where time between '?' and '?'"+
					"and sensor_type_id = ?; "	
	db.query (query_str, [type_stats,date1,date2,type_sensor], getData (err, rows))
 }


function getData ( err, rows){
	var array = [] ;
	for (var r in rows) {
    	console.log(r.value);
    	array.push(r);
    }
}


function start ( ) {

}


exports.start = start 
exports.get_stats = get_stats
exports.temperature_h = temperature_h
exports.temperature_d = temperature_d
exports.temperature_m = temperature_m
exports.consumption_h = consumption_h
exports.consumption_d = consumption_d
exports.consumption_m = consumption_m
exports.statsRH = statsRH