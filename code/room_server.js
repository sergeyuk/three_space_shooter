var url = require("url");
var fs = require('fs')
var ShipClass = require( "./shared/ship" ).ShipClass;
var WorldClass = require( "./shared/world" ).WorldClass;
var ProjectileClass = require( "./shared/projectile" ).ProjectileClass;
require( "./shared/custom_math" );
var FlagClass = require( "./shared/flag" ).FlagClass;


var G2F_CONNECT_REQUEST = 0;
var G2F_INITIAL_DATA = 1;
var G2F_ADD_USER_RESPONSE = 2;

var F2G_CONNECT_RESPONSE = 0;
var F2G_ADD_USER_REQUEST = 1;


var ROOM_SERVER_DATA = {
	expected_users : {},
	connected_users : {},
	last_user_id : 0,
	default_spawn_point : {x:0,y:0,z:0},
	world : new WorldClass()
};

var server_connection = require('net').connect( 8124, function(){
	server_connection.write( JSON.stringify( { message_type: G2F_CONNECT_REQUEST }) );
});


server_connection.on( 'data', function( data ){
	console.log( 'server_connection.on(data: ' + data );	
	data = JSON.parse( data );
	if( data.msg_type == F2G_CONNECT_RESPONSE ){
		var app = require('http').createServer( http_handler )
		var io = require('socket.io').listen( app );
		
		io.sockets.on('connection', function( socket ){
			// Client callbacks
			console.log( 'Received connection request from the client...' );
			socket.emit( 'initially connected' );
			
			socket.on( 'handshake', function( data ){
				console.log( 'Received handshake request from the client...' );
				var user_id = data.id;
				var guid = data.guid;
				if( ROOM_SERVER_DATA.expected_users[user_id].guid == guid ){
					// Make this user as connected
					ROOM_SERVER_DATA.connected_users[user_id] = ROOM_SERVER_DATA.expected_users[user_id];
					delete ROOM_SERVER_DATA.expected_users[user_id];
					
					socket.emit( 'handshake accepted' );
					console.log( 'Handshake accepted by the server. Now sending game messages..' );
					
					var this_user_id = ROOM_SERVER_DATA.last_user_id++;
					var new_ship = new ShipClass();
					new_ship.mesh = 1;
					new_ship.set_position( ROOM_SERVER_DATA.default_spawn_point );
					ROOM_SERVER_DATA.world.ships[this_user_id] = new_ship;
					socket.set('id', this_user_id );
					socket.emit( "connected", [this_user_id, ROOM_SERVER_DATA.world.ships] );
					socket.broadcast.emit( 'connected', [this_user_id, ROOM_SERVER_DATA.world.ships] );	

				}
			});
			
			socket.on( 'ship control on', function(key){ 
				socket.get( 'id', function( err, user_id ){
					//console.log( "ship control on. id=" + user_id );
					var this_ship = ROOM_SERVER_DATA.world.ships[user_id];
					var fwd = this_ship.get_forward();
					var turn = this_ship.get_turn();
					if(key == 0 ) this_ship.set_forward( -1 );
					if(key == 1 ) this_ship.set_turn( 1 );
					if(key == 2 ) this_ship.set_forward( 1 );
					if(key == 3 ) this_ship.set_turn( -1 );
					if( fwd != this_ship.get_forward() || turn != this_ship.get_turn() ){
						//console.log( '=============BROADCAST================');
						socket.broadcast.emit( 'ship control update', [user_id, this_ship.get_forward(), this_ship.get_turn()] );
					}
				});
			});

			socket.on( 'ship control off', function(key){ 
				socket.get( 'id', function( err, user_id ){
					var this_ship = ROOM_SERVER_DATA.world.ships[user_id];
					var fwd = this_ship.get_forward();
					var turn = this_ship.get_turn();
					if(key == 0 ) this_ship.set_forward( 0 );
					if(key == 1 ) this_ship.set_turn( 0 );
					if(key == 2 ) this_ship.set_forward( 0 );
					if(key == 3 ) this_ship.set_turn( 0 );
					if( fwd != this_ship.get_forward() || turn != this_ship.get_turn() ){
						//console.log( '=============BROADCAST================');
						socket.broadcast.emit( 'ship control update', [user_id, this_ship.get_forward(), this_ship.get_turn()] );
					}
				});
			});
		
			socket.on( 'ship shot', function( data ){
				socket.broadcast.emit( 'ship shoot event', data );
				ROOM_SERVER_DATA.world.add_shot( data[0] );
			});
			
			socket.on('disconnect', function() {
				socket.get( 'id', function( err, user_id ){
					delete ROOM_SERVER_DATA.world.ships[user_id];
					console.log( "broadcasting disconnect message. Client id=" + user_id );
					socket.broadcast.emit( 'disconnected', user_id );
				});
			});
		});
		
		app.listen( data.port );
		
		console.log( 'Listening to port ' + data.port )
		
		server_connection.write( JSON.stringify( { 
			message_type: G2F_INITIAL_DATA, 
			address: app.address().address 
		} ) );
	}
	else if( data.msg_type == F2G_ADD_USER_REQUEST ){
		var user_id = data.client_id;
		var guid = data.guid;
		// expected user
		ROOM_SERVER_DATA.expected_users[user_id] = { guid: guid }
		console.log( 'Added expected user. ID: ' + user_id );
		
		server_connection.write(JSON.stringify({
			message_type: G2F_ADD_USER_RESPONSE,
			user_id: user_id,
			guid: guid
		}));		
	}
});


function http_handler (req, res) {
	if (req.method === "GET" || req.method === "HEAD") {
		var pathname = url.parse(req.url).pathname;
		console.log( pathname );
		if( pathname === '/' ) pathname = '/index.html';
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

/*
var url = require("url");
var ShipClass = require( "./shared/ship" ).ShipClass;
var WorldClass = require( "./shared/world" ).WorldClass;
var ProjectileClass = require( "./shared/projectile" ).ProjectileClass;
require( "./shared/custom_math" );
var FlagClass = require( "./shared/flag" ).FlagClass;




var GAME = {
	last_user_id : 0,
	default_spawn_point : {x:0,y:0,z:0},
	world : new WorldClass()
};

var app = require('http').createServer(handler)
var io = require('socket.io').listen(app)
var fs = require('fs')

console.log("start the stuff....");
io.set( 'log level', 0 );

io.sockets.on('connection', function (socket) {
	
	var this_user_id = GAME.last_user_id++;
//	socket.set('id', this_user_id);	
	console.log( "connected one.." );

	var new_ship = new ShipClass();
	new_ship.mesh = 1;
	new_ship.set_position( GAME.default_spawn_point );
	GAME.world.ships[this_user_id] = new_ship;
	socket.set('id', this_user_id );
	socket.emit( "connected", [this_user_id, GAME.world.ships] );
	socket.broadcast.emit( 'connected', [this_user_id, GAME.world.ships] );	

	socket.on( 'ship control on', function(key){ 
		socket.get( 'id', function( err, user_id ){
			//console.log( "ship control on. id=" + user_id );
			var this_ship = GAME.world.ships[user_id];
			var fwd = this_ship.get_forward();
			var turn = this_ship.get_turn();
			if(key == 0 ) this_ship.set_forward( -1 );
			if(key == 1 ) this_ship.set_turn( 1 );
			if(key == 2 ) this_ship.set_forward( 1 );
			if(key == 3 ) this_ship.set_turn( -1 );
			if( fwd != this_ship.get_forward() || turn != this_ship.get_turn() ){
				//console.log( '=============BROADCAST================');
				socket.broadcast.emit( 'ship control update', [user_id, this_ship.get_forward(), this_ship.get_turn()] );
			}
		});
	});

	socket.on( 'ship control off', function(key){ 
		socket.get( 'id', function( err, user_id ){
			var this_ship = GAME.world.ships[user_id];
			var fwd = this_ship.get_forward();
			var turn = this_ship.get_turn();
			if(key == 0 ) this_ship.set_forward( 0 );
			if(key == 1 ) this_ship.set_turn( 0 );
			if(key == 2 ) this_ship.set_forward( 0 );
			if(key == 3 ) this_ship.set_turn( 0 );
			if( fwd != this_ship.get_forward() || turn != this_ship.get_turn() ){
				//console.log( '=============BROADCAST================');
				socket.broadcast.emit( 'ship control update', [user_id, this_ship.get_forward(), this_ship.get_turn()] );
			}
		});
	});

	socket.on( 'ship shot', function( data ){
		socket.broadcast.emit( 'ship shoot event', data );
		GAME.world.add_shot( data[0] );
	});
	
	socket.on('disconnect', function() {
		socket.get( 'id', function( err, user_id ){
			delete GAME.world.ships[user_id];
			console.log( "broadcasting disconnect message. Client id=" + user_id );
			socket.broadcast.emit( 'disconnected', user_id );
		});
	});
});

app.listen(8000);

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

process.nextTick(sync_function);
//setInterval( sync_function, 100 );

*/