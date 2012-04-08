var url = require("url");

function handler (req, res) {
	if (req.method === "GET" || req.method === "HEAD") {
		var pathname = url.parse(req.url).pathname;
		console.log( pathname );
		if( pathname === '/' ) pathname = '/front_end.html';
		fs.readFile('.' + pathname, function (err, data) {
			if (err) {
				res.writeHead(500);
				return res.end('Error loading ' + pathname);
			}

			res.writeHead(200);
			res.end(data);
		});
	}
}

var app = require('http').createServer(handler)
var io = require('socket.io').listen(app)
var fs = require('fs')

console.log("started front end server...");
//io.set( 'log level', 0 );

var FRONT_END_SERVER_DATA = {
	user_id_counter : 0,
	users_logged_in : {}
};

var DATABASE = new function(){
	this.registered_users = {};
};

DATABASE.get_registered_user = function( user_name ){
	if( this.registered_users.hasOwnProperty( user_name ) ){
		return this.registered_users[user_name];
	}
	else{
		return undefined;
	}
}

DATABASE.is_user_registered = function( user_name ){
	return ( this.get_registered_user( user_name ) !== undefined );
}

io.sockets.on('connection', function (socket) {
	var this_user_id = FRONT_END_SERVER_DATA.user_id_counter++;
	console.log( "Received connection request from the client" );

	socket.set('id', this_user_id );
	socket.emit( "connected" );

	socket.on( 'login request', function( data ){
		if( data && data[0] ){
			socket.get( 'id', function( err, user_id ){
				var user_name = data[0];
				if( DATABASE.is_user_registered( user_name ) ){
					FRONT_END_SERVER_DATA.users_logged_in[ user_id ] = { name: user_name };
					socket.broadcast.emit( 'new user', user_name );
					socket.emit( 'login accepted', DATABASE.get_registered_user( user_name ) );	
				}
				else{
					socket.emit( 'create new user', user_name );
				}
			});
		}
		else{
			socket.emit( 'error', 'login rejected' );
		}
	});
	
	socket.on('disconnect', function() {
		socket.get( 'id', function( err, user_id ){
			var logged_in_users = FRONT_END_SERVER_DATA.users_logged_in;
			
			if( logged_in_users.hasOwnProperty( user_id ) ){
				delete logged_in_users[user_id];			
				console.log( "broadcasting disconnect message. Client id=" + user_id );
				socket.broadcast.emit( 'disconnected', user_id );				
			}
		});
	});
	
	socket.on( 'chat msg', function( data ) {
		socket.broadcast.emit( 'chat msg', data );
	});
	
	socket.on( 'join room request', function(){
		// Not implemented yet
	});
});

app.listen(8000);

/*
var last_time_value = new Date().getTime();

var sync_function = function(){
	var current_time_value = new Date().getTime();
	var dt = current_time_value - last_time_value;
	if( dt > 0 ){
		last_time_value = current_time_value;
		GAME.world.tick( dt / 1000.0 );
		io.sockets.emit('update', GAME.world.ships);
		process.nextTick(sync_function);
	}
	else{
		setTimeout(sync_function, 1)
	}	
}

process.nextTick(sync_function);*/


