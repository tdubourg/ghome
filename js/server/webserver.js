var http      = require('http')
var fs        = require('fs')
var mime      = require('mime')
var tpl       = require('./template_engine')
var shared    = require('./shared_data')
var sseSender = require('./sse_sender')
var qs 		  = require('querystring');

var webdir = '../..'
/**
 * Request handlers
 * Prototype: function(req, res, params, response_sender)
 * This function is called when there is a module param in the URL
 * Each module MUST be declared with a handler. Else the server won't be able to serve the file
 */
var requestHandlers = {
	  'home'              : homeReqHandler
	, 'device_management' : defaultHtmlRequestHandler
	, 'new_device'        : defaultHtmlRequestHandler
	, 'app'               : defaultHtmlRequestHandler
	, 'default'           : defaultReqHandler
	, 'postform'		  : postformHandler //test post implementation selim 	
}

/* Same format as the request handles dict. Exceptions for the default request handler*/
var exceptions = {
	'/sse' : sseSender.requestHandler
}


function postformHandler(req, res, params, response_sender, postData){
		var templateData = {
		'IN_TEMP'		       : shared.get_shared_data('IN_TEMP')
		, 'OUT_TEMP'	     : shared.get_shared_data('OUT_TEMP')
		, 'TEST_DATA'		 : postData
		//, 'COLOR_TEMP_IN'  : temp2color(get_shared_data('IN_TEMP'))
		//, 'COLOR_TEMP_OUT' : temp2color(get_shared_data('OUT_TEMP'))
	}
	var data = tpl.get_template_result("postform.html", templateData)
	console.log(params['pathname'])
	params['fileUrl'] = 'postform.html'
	response_sender(req, res, params, data)
}

/** Appends '.html' to the module name and uses it as fileName */
function defaultHtmlRequestHandler(req, res, params, response_sender) {
	params['fileUrl'] = '../../views/' + params.query.module + '.html'
	defaultResponseSender(req, res, params, fs.readFileSync(params.fileUrl))
}

/** Kept for great justice 
 * Shortcut to for a request handler that allows to specify a file name
 * Can be used as: 
 * function(){sendPlainHTML('my_file.html', arguments)}
 */
function sendPlainHTML(fileName, args, path) {
	//* args: {0: req, 1: res, 2: params, 3: requestHandler}
	if (!path) path = '../../views/'
	args[2]['fileUrl'] = path + fileName
	args[3](args[0], args[1], args[2], fs.readFileSync(args[2]['fileUrl']))

}

// @TODO: MOVE IN ANOTHER FILE BEGIN ///////////////////////////////////////////////////////////////
function homeReqHandler(req, res, params, response_sender) {
	var templateData = {
		'IN_TEMP'		       : shared.get_shared_data('IN_TEMP')
		, 'OUT_TEMP'	     : shared.get_shared_data('OUT_TEMP')
		//, 'COLOR_TEMP_IN'  : temp2color(get_shared_data('IN_TEMP')) //@TODO the below two lines are crashing the server, please recheck
		//, 'COLOR_TEMP_OUT' : temp2color(get_shared_data('OUT_TEMP'))
	}
	var data = tpl.get_template_result("home.html", templateData)
	console.log(params['pathname'])
	params['fileUrl'] = 'home.html'
	response_sender(req, res, params, data)
}

/**  This function returns the CSS temperature color to be applied to a given
 * temperature depending on its value
 * For instance, -2 would be blue, 25 would be green, 32 would be red...
 * @param{int} temperature_value The temperature value (signed integer)
 * @return{string} Color name to be used in the CSS class ("{COLOR}-temp")
 */
var temp2color = function(temperature_value) {
	var color = ''
	if (temperature_value >= 32) {
		color = 'red1'
	} else if (temperature_value >= 25) {
		color = 'green3'
	} else if (temperature_value >= 19) {
		color = 'green2'
	} else if (temperature_value >= 10) {
		color = 'green1'
	} else if (temperature_value >= 5) {
		color = 'blue1'
	} else if (temperature_value >= 0) {
		color = 'blue2'
	} else if (temperature_value >= -5) {
		color = 'blue3'
	} else if (temperature_value <= -10) {
		color = 'blue4'
	}
	return color
}
// @TODO: MOVE IN ANOTHER FILE END /////////////////////////////////////////////////////////////////


/**
 * responseSender is going to be the default callback of every requestHandler
 * It sets the HTTP status to OK 200 and sends the content to be returned to the browser client
 * using the default mime type found using the file extension
 * IF YOU WANT TO WRITE YOUR OWN Content-Type HEADER THEN JUST DON'T CALL THE CALLBACK...
 * @param{http.ServerRequest} original request from the browser client
 * @param{http.ServerResponse} response object to send to the browser client
 * @param{???} parameters defined by the webserver
 * @param{string or Buffer} data to be send to the browser client using res.end()
 * @return{undefined} undefined
*/
function defaultResponseSender(req, res, params, data) {
	res.writeHead(200, {'Content-Type': mime.lookup(params.fileUrl)})
	res.end(data)
}

/** @TODO to be documented */
function defaultReqHandler(req, res, params, responseSender) {
	if (params.pathname in exceptions) {
		exceptions[params.pathname](req,res,params, responseSender)
	} else {
		fs.readFile(webdir + params.pathname, null, function (err, data) {
			if (err) {
				console.error(err)
			}
			params.fileUrl = params.pathname
			responseSender(req, res, params, data)
		})
	}
}


function start (db, port) {
	console.log('Starting webserver')
	http.createServer(function (req, res) {

		var postData = "";
		req.setEncoding("utf8"); 

		//* Note : req is an instance of http.ServerRequest and res is an instance of http.ServerResponse
		try {
			var urlParams = require('url').parse(req.url, true)
			
			if (!urlParams.query.module) {
				if (urlParams['pathname'] == '/' || urlParams['pathname'].split('.').pop() == 'html') {
					urlParams.query.module = 'home'
					} else {
					urlParams.query.module = 'default'
					}
				}

			//handlig POST data	
			if(req.method === "POST"){
				req.addListener("data", function(postDataChunk) {
				postData += postDataChunk;
				//console.log("Received POST data chunk '"+ postDataChunk + "'.");
				var json = qs.parse(postData);
				console.log(json);
				});
			}

			req.addListener("end", function() {
				if(urlParams.query.module in requestHandlers) {
					requestHandlers[urlParams.query.module](req, res, urlParams, defaultResponseSender, postData)
				} else {
					//@TODO 404 error
				}
			});

		} catch(e) {
			console.log(e)
		}
	}).listen(port)
}

exports.start = start
