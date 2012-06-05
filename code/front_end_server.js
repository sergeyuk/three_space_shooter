/*
 * TODO:
 * 	* Let the room server know if the expected client disconnected 
 *  
 */
 
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

var Database = require( './server/database' ).Database;
var db = new Database;


var BASE_ROOM_SERVER_PORT_NUMBER = 9000;

var G2F_CONNECT_REQUEST = 0;
var G2F_INITIAL_DATA = 1;
var G2F_ADD_USER_RESPONSE = 2;

var F2G_CONNECT_RESPONSE = 0;
var F2G_ADD_USER_REQUEST = 1;


var tcp_server = require('net').createServer( function ( conn ){	
	console.log('Connected room server...');
	
	conn.game_server_id = FRONT_END_SERVER_DATA.room_servers_id_counter++;
	
	conn.on('data', function(data){
		console.log( 'Received data from a room server. Data: ' + data );
		data = JSON.parse( data );
		var port_number = BASE_ROOM_SERVER_PORT_NUMBER + conn.game_server_id;
		var type = data.message_type;
		if( type == G2F_CONNECT_REQUEST ){
			conn.write( JSON.stringify( { msg_type: F2G_CONNECT_RESPONSE, port: port_number } ) );
		}
		else if( type == G2F_INITIAL_DATA ){
			FRONT_END_SERVER_DATA.room_servers[conn.game_server_id] = {
				port: port_number
				,address: data.address
				,socket: conn
				//,num_joined : 0
			};
		}
		else if( type == G2F_ADD_USER_RESPONSE ){
			var user_id = data.user_id;
			var guid = data.guid;
			
			var user = FRONT_END_SERVER_DATA.users_logged_in[user_id];
			var server = FRONT_END_SERVER_DATA.room_servers[conn.game_server_id];
			
			user.socket.emit( 'game session started', { 
				address: server.address,
				port: server.port,
				access_data: { user_id: user_id, guid: guid }
			} );
		}
	});
	
	conn.on('end', function() {
		console.log('server disconnected');
	});
	//conn.pipe(conn);
});

tcp_server.listen( 8124 );

console.log("started front end server...");
//io.set( 'log level', 0 );

var FRONT_END_SERVER_DATA = {
	user_id_counter : 0,
	users_logged_in : {},
	
	room_servers_id_counter : 0,
	room_servers : {}
};

io.sockets.on('connection', function (socket) {
	var this_user_id = FRONT_END_SERVER_DATA.user_id_counter++;
	console.log( "Received connection request from the client" );

	socket.set('id', this_user_id );
	socket.emit( "connected" );

	socket.on( 'login request', function( data ){
		if( data && data[0] ){
			socket.get( 'id', function( err, user_id ){
				var user_name = data[0];
				if( db.is_user_registered( user_name ) ){
					login_user( user_name, user_id, socket );
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
	
	socket.on( 'create new user request', function( data ){
		socket.get( 'id', function( err, user_id ){
			if( data && data.length == 2 ){
				var desired_nickname = data[0];
				var desired_ship_id = data[1];
				
				if( !db.is_user_registered( desired_nickname) ){
					db.register_new_user( desired_nickname, {name:desired_nickname, ship:desired_ship_id} )
					login_user( desired_nickname, user_id, socket );
				}
				else{
					socket.emit( 'error', 'Nickname ' + desired_nickname + ' is already taken.' );
				}
			}
		});
	});
	
	socket.on('disconnect', function() {
		socket.get( 'id', function( err, user_id ){
			var logged_in_users = FRONT_END_SERVER_DATA.users_logged_in;
			
			if( logged_in_users.hasOwnProperty( user_id ) ){
				var user_name = logged_in_users[user_id].name;
				delete logged_in_users[user_id];
				console.log( "broadcasting disconnect message. Client id=" + user_id );
				socket.broadcast.emit( 'chat', 'User ' + user_name + ' has been disconnected!' );				
			}
		});
	});
	
	socket.on( 'chat msg', function( data ) {
		socket.broadcast.emit( 'chat msg', data );
	});
	
	socket.on( 'join room request', function(){
		socket.get( 'id', function( err, user_id ){
			var user = FRONT_END_SERVER_DATA.users_logged_in[user_id];
			var room_server_id = find_the_best_room_server( user_id );
			
			var random_value = get_random_guid();
			var room_server = FRONT_END_SERVER_DATA.room_servers[room_server_id];
			room_server.socket.write( JSON.stringify(
				{ 	msg_type: F2G_ADD_USER_REQUEST, 
					client_id: user_id, 
					guid: random_value,
					ship_data: { id: user.obj.ship } } 
				) )
		})
		// Not implemented yet
	});
});

function find_the_best_room_server( user_id ){
	for( var server_id in FRONT_END_SERVER_DATA.room_servers ){
		return server_id;
	}
}

function get_online_user_object( username ){
	for( var user_id in FRONT_END_SERVER_DATA.users_logged_in ){
		if( FRONT_END_SERVER_DATA.users_logged_in.hasOwnProperty( user_id ) ){
			var user = FRONT_END_SERVER_DATA.users_logged_in[user_id];
			if( user.name == username ){
				return user;
			}
		}		
	}
	
	return undefined;
}

function login_user( username, user_id, socket ){
	if( get_online_user_object( username ) === undefined ){
		var user_object = db.get_registered_user( username );
		
		FRONT_END_SERVER_DATA.users_logged_in[ user_id ] = { 
			name: username, 
			obj: user_object, 
			socket: socket 
		};
		
		socket.broadcast.emit( 'new user', username );
		socket.emit( 'login accepted', user_object );
	}
	else{
		socket.emit( 'error', "User " + username + " is already logged in." );
	}
}

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


function get_random_guid() {
	function S4() {
		return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	}
	return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}


