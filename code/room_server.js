var url = require("url");
var fs = require('fs')
var ShipClass = require( "./shared/ship" ).ShipClass;
var WorldClass = require( "./shared/world" ).WorldClass;
var ProjectileClass = require( "./shared/projectile" ).ProjectileClass;
require( "./shared/custom_math" );
var FlagClass = require( "./shared/flag" ).FlagClass;

var app = require('http').createServer( http_handler )
		
var io = require('socket.io').listen( app );
io.set( 'log level', 2 );

var os = require("os");

var G2F_CONNECT_REQUEST = 0;
var G2F_INITIAL_DATA = 1;
var G2F_ADD_USER_RESPONSE = 2;

var F2G_CONNECT_RESPONSE = 0;
var F2G_ADD_USER_REQUEST = 1;

var PRE_ROUND_IDLE_GAME_STATE = 1;
var PRE_ROUND_GAME_STATE = 2;
var IN_ROUND_GAME_STATE = 3;
var POST_ROUND_GAME_STATE = 4;

var default_spawn_points = [ 
	{x:0,y:0,z:0} 
];

function pre_allocate_spawn_points( steps_num ){
	console.log( 'pre allocating default spawn points' );
	var distance_multiplier = 10;
	
	for( var i = 1; i <= steps_num; i++ ){
		var value = distance_multiplier * i;
		default_spawn_points.push( {x:value,y:0,z:0} );
		default_spawn_points.push( {x:-value,y:0,z:0} );
		
		default_spawn_points.push( {x:0,y:value,z:0} );
		default_spawn_points.push( {x:0,y:-value,z:0} );
		
		default_spawn_points.push( {x:value,y:value,z:0} );
		default_spawn_points.push( {x:value,y:-value,z:0} );
		
		default_spawn_points.push( {x:-value,y:value,z:0} );
		default_spawn_points.push( {x:-value,y:-value,z:0} );
	}	
}
pre_allocate_spawn_points( 2 );

function get_available_spawn_point(){
	// TODO: add a list of available spawn points
	var index = Math.floor((Math.random()*default_spawn_points.length));
	console.log( 'get available spawn point. Index: ' + index );
	console.log( default_spawn_points[index] );
	return default_spawn_points[index]; 
}

var ROOM_SERVER_DATA = {
	game_state : PRE_ROUND_IDLE_GAME_STATE,
	expected_users : {},
	connected_users : {},
	//default_spawn_point : {x:0,y:0,z:0},
	world : new WorldClass(),
	last_time_value : new Date().getTime()
};

function init_game_world(){
	ROOM_SERVER_DATA.world.set_ship_projectile_collision_callback( on_ship_projectile_callback );
}

var server_connection = require('net').connect( 8124, function(){
	server_connection.write( JSON.stringify( { message_type: G2F_CONNECT_REQUEST }) );
});

// Sends events!
function respawn_user( user_id ){
	var ship = ROOM_SERVER_DATA.world.ships[user_id];
	ship.set_position( get_available_spawn_point() );
	ship.set_alive();
	io.sockets.emit('respawn', [user_id, ship]);
}

function on_ship_projectile_callback(hit_ship, projectile ){
	console.log( 'on_ship_projectile_callback called.')
	var ship_id = projectile.owner_id 
	if( ROOM_SERVER_DATA.connected_users.hasOwnProperty( ship_id ) && hit_ship.life == 0 ){
		console.log( 'User ' + ship_id + " has killed another user" );
		var user = ROOM_SERVER_DATA.connected_users[ship_id];
		user.score += 1;
		user.socket.emit( 'update score', user.score );
	}
}

server_connection.on( 'data', function( data ){
	console.log( 'server_connection.on(data: ' + data );	
	data = JSON.parse( data );
	if( data.msg_type == F2G_CONNECT_RESPONSE ){
		
		io.sockets.on('connection', function( socket ){
			// Client callbacks
			console.log( 'Received connection request from the client...' );
			socket.emit( 'initially connected' );
			
			socket.on( 'handshake', function( data ){
				console.log( 'Received handshake request from the client...' );
				console.log( data );
				var user_id = "" + data.user_id + "";
				var guid = data.guid;
				console.log( "Expected users: " );
				console.log( ROOM_SERVER_DATA.expected_users );
				console.log( "ROOM_SERVER_DATA.expected_users[" + user_id + "] => " );
				console.log( ROOM_SERVER_DATA.expected_users[user_id] );
				if( ROOM_SERVER_DATA.expected_users.hasOwnProperty( user_id ) && ROOM_SERVER_DATA.expected_users[user_id].guid == guid ){
					// Make this user as connected
					ROOM_SERVER_DATA.connected_users[user_id] = ROOM_SERVER_DATA.expected_users[user_id];
					delete ROOM_SERVER_DATA.expected_users[user_id];
					
					socket.emit( 'handshake accepted' );
					socket.emit( 'update game state', ROOM_SERVER_DATA.game_state );
					console.log( 'Handshake accepted by the server. Now sending game messages..' );
					
					var new_ship = new ShipClass();
					new_ship.mesh = ROOM_SERVER_DATA.connected_users[user_id].ship_data.id;
					ROOM_SERVER_DATA.world.ships[user_id] = new_ship;
					
					socket.set('id', user_id );
					socket.emit( "connected", [user_id, ROOM_SERVER_DATA.world.ships] );
					socket.broadcast.emit( 'connected', [user_id, ROOM_SERVER_DATA.world.ships] );
					
					respawn_user( user_id );
					ROOM_SERVER_DATA.connected_users[user_id].socket = socket;
				}
				else{
				    socket.disconnect();
				}
			});
			
			socket.on( 'ship control on', function(key){ 
				socket.get( 'id', function( err, user_id ){
					if( ROOM_SERVER_DATA.game_state == IN_ROUND_GAME_STATE ){
						var this_ship = ROOM_SERVER_DATA.world.ships[user_id];
						if( this_ship.is_alive() ){
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
						}
					}
				});
			});

			socket.on( 'ship control off', function(key){ 
				socket.get( 'id', function( err, user_id ){
					if( ROOM_SERVER_DATA.game_state == IN_ROUND_GAME_STATE ){
						var this_ship = ROOM_SERVER_DATA.world.ships[user_id];
						if( this_ship.is_alive() ){
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
						}
					}
				});
			});
		
			socket.on( 'ship shot', function(){
				socket.get( 'id', function( err, user_id ){
					if( ROOM_SERVER_DATA.game_state == IN_ROUND_GAME_STATE ){
						var this_ship = ROOM_SERVER_DATA.world.ships[user_id];
						if( this_ship.is_alive() ){
							socket.broadcast.emit( 'ship shoot event', [user_id]);
							ROOM_SERVER_DATA.world.add_shot( user_id );
						}
						else{
							respawn_user( user_id );
						}
					}
				});
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
		var hostname = os.hostname();
		console.log( '========= HOST ====================' );
		console.log( hostname );
		console.log( '=============================' );
		
		console.log( app._handle.socket );
		
		server_connection.write( JSON.stringify( { 
			message_type: G2F_INITIAL_DATA, 
			//address: app.address().address
			address: hostname 
		} ) );
		
		var change_game_state = function( new_state ){
			// Notify clients about this
			console.log( 'Changing game state to ' + new_state );
			ROOM_SERVER_DATA.game_state = new_state;
			io.sockets.emit( 'update game state', ROOM_SERVER_DATA.game_state );
		};
		
		var sync_function = function(){
			var current_time_value = new Date().getTime();
			//console.log( 'Current state: ' + ROOM_SERVER_DATA.game_state );
			if( ROOM_SERVER_DATA.game_state == PRE_ROUND_IDLE_GAME_STATE ){
				// Check number of users
				if( Object.keys( ROOM_SERVER_DATA.connected_users ).length > 0 ){
					change_game_state( PRE_ROUND_GAME_STATE );
					ROOM_SERVER_DATA.last_time_value = current_time_value;
				}
			}
			else if( ROOM_SERVER_DATA.game_state == PRE_ROUND_GAME_STATE ){
				// Count down
				var dt = current_time_value - ROOM_SERVER_DATA.last_time_value;
				if( dt > 10000 ){
					ROOM_SERVER_DATA.last_time_value = current_time_value;
					change_game_state( IN_ROUND_GAME_STATE );
				}
			}
			else if( ROOM_SERVER_DATA.game_state == IN_ROUND_GAME_STATE ){
				// Simulate
				var dt = current_time_value - ROOM_SERVER_DATA.last_time_value;
				if( dt > 0 ){
					ROOM_SERVER_DATA.last_time_value = current_time_value;
					ROOM_SERVER_DATA.world.tick( dt / 1000.0 );
					ROOM_SERVER_DATA.post_tick();
					io.sockets.emit('update', ROOM_SERVER_DATA.world.ships);
					process.nextTick(sync_function);
				}
				else{
					setTimeout(sync_function, 1)
				}
				return;
			}
			else if( ROOM_SERVER_DATA.game_state == POST_ROUND_GAME_STATE ){
				
			}
			
			setTimeout(sync_function, 1)
		};
		
		process.nextTick(sync_function);
		init_game_world();
	}
	else if( data.msg_type == F2G_ADD_USER_REQUEST ){
		var user_id = data.client_id;
		var guid = data.guid;
		// expected user
		ROOM_SERVER_DATA.expected_users[user_id] = { guid: guid, ship_data : data.ship_data, score:0 }
		console.log( 'Added expected user. ID: ' + user_id );
		
		server_connection.write(JSON.stringify({
			message_type: G2F_ADD_USER_RESPONSE,
			user_id: user_id,
			guid: guid
		}));		
	}
});

ROOM_SERVER_DATA.post_tick = function(){
	for( var user_id in ROOM_SERVER_DATA.world.ships ){
		var ship = ROOM_SERVER_DATA.world.ships[user_id];
		if( ship.life == 0 ){
			ship.set_dead();
		}
	}
}

function http_handler (req, res) {
	console.log( "HTTP RQ: " );
	console.log( req );
	console.log( "============================================" );
	
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
