var url = require("url");
var ShipClass = require( "./shared/ship" ).ShipClass;
var WorldClass = require( "./shared/world" ).WorldClass;
var ProjectileClass = require( "./shared/projectile" ).ProjectileClass;
require( "./shared/custom_math" );
var FlagClass = require( "./shared/flag" ).FlagClass;

function handler (req, res) {
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

