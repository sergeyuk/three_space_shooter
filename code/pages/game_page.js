var PRE_ROUND_IDLE_GAME_STATE = 1;
var PRE_ROUND_GAME_STATE = 2;
var IN_ROUND_GAME_STATE = 3;
var POST_ROUND_GAME_STATE = 4;

var GAME_PAGE_DATA_CLASS = function(){
	this.div;
	this.stats;
	this.camera;
	this.cameraTarget;
	this.scene;
	this.renderer;
	this.world;
	this.particleLight;
	this.pointLight;
	this.directionalLight;
	this.ambientLight;
	
	this.skyboxScene;
	this.skyboxCamera;
	this.skyboxCameraTarget;
	this.reflectionCube;
	
	// particles
	this.particlesScene;
	this.socket;
	this.this_ship_id = -1;
	
	this.last_time_t = 0;
	this.stop_rendering = false;
	this.ship_meshes = [];
	
	this.game_state = PRE_ROUND_IDLE_GAME_STATE;

	this.create_ships_from_server_data = function( data ){
		for( var client_id in data ){
			this.world.ships[client_id] = new ShipClass();
			this.load_ship( client_id, data[client_id] );
		}
	}

	this.load_ship = function( client_id, server_obj ){
		var that = this;

		var new_ship = this.world.ships[client_id];
		new_ship.set_position( server_obj.pos );

		var mesh_id = server_obj.mesh;
		
		load_ship_geometry( mesh_id, function( geometry, material ){
			new_ship.mesh = new THREE.Mesh( geometry, material );
			that.scene.add(new_ship.mesh);
			new_ship.mesh.position.set( new_ship.pos.x, new_ship.pos.y, new_ship.pos.z );
			
			//new_ship.particle_emitter = create_particle_system();
			//new_ship.particle_emitter.offset = new Three.Vector3();
			if( new_ship.particle_emitter ) {
				new_ship.particle_emitter.container().rotation.z = Math.PI;
			}
		});
	}

	this.create_skybox = function(){
		var path = "textures/skybox/";
		var format = '.jpg';
		var urls = [
				path + 'px' + format, path + 'nx' + format,
				path + 'py' + format, path + 'ny' + format,
				path + 'pz' + format, path + 'nz' + format
			];

		this.reflectionCube = THREE.ImageUtils.loadTextureCube( urls );
		
		var shader = THREE.ShaderUtils.lib[ "cube" ];
		shader.uniforms[ "tCube" ].texture = this.reflectionCube;

		var material = new THREE.ShaderMaterial({
			fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: shader.uniforms,
			depthWrite: false
		});

		var mesh = new THREE.Mesh( new THREE.CubeGeometry( 100, 100, 100 ), material );
		mesh.flipSided = true;
		this.skyboxScene.add( mesh );
	}

	this.create_shoot = function( owner_ship_id ){
		this.world.add_shot( owner_ship_id );
		this.create_projectile_mesh( this.world.projectiles.length - 1 );	
	}

	this.create_projectile_mesh = function( projectile_id ){
		var projectile_mesh = new THREE.Mesh( new THREE.SphereGeometry( 1, 32, 16 ), new THREE.MeshBasicMaterial( { color:0xFF0000, wireframe:false} ) );
		this.scene.add( projectile_mesh );
		if( this.world.projectiles.length > projectile_id ){
			this.world.projectiles[projectile_id].mesh = projectile_mesh;
		}
		else{
			alert( 'wrong projectile ID passed' );
		}
	}
	
	this.delete_projectile = function( id ){
		this.scene.remove( this.world.projectiles[id].mesh );
	}

	
	this.init_3d_scene = function(){
		var width = window.innerWidth,
			height = window.innerHeight;
		
		this.stats = new Stats();
		this.stats.domElement.style.position = 'absolute';
		this.stats.domElement.style.top = '10px';
		this.div.appendChild( this.stats.domElement );
		
		// Create camera
		var camera = new THREE.CombinedCamera( width, height, 45, 1, 10000, -2000, 10000 );
		camera.position.set( 0, -15, 10 );
		camera.up.x = camera.up.y = 0;
		camera.up.z = 1;
		this.cameraTarget = new THREE.Vector3(0,0,0); 
		camera.lookAt( this.cameraTarget );

		this.skyboxCamera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 100 );
		this.skyboxCameraTarget = new THREE.Vector3( 0, 0, 0 );

		// Create scene
		var scene = new THREE.Scene();
		scene.add( camera );
		
		this.skyboxScene = new THREE.Scene();
		this.skyboxScene.add( this.skyboxCamera );
		
		this.particlesScene = new THREE.Scene();
		
		// Setup canvas
		var renderer = new THREE.WebGLRenderer({ antialias : true, clearAlpha: 1 });
		renderer.setSize( width, height );
		renderer.autoClear = false;
		this.div.appendChild( renderer.domElement );
			
		// Setup light sources
		scene.add( new THREE.AmbientLight( 0x111111 ) );
		
		var point_light = new THREE.PointLight( 0xFFFFFF );
		point_light.position.set( 10, 50, 130 );
		scene.add( point_light );
		
		var directional_light = new THREE.DirectionalLight( 0xffffff );
		directional_light.position.set( 10, 50, 130 ).normalize();
		scene.add( directional_light );

		// Test plane
		var plane = new THREE.Mesh( new THREE.PlaneGeometry(1000,1000,20,20), new THREE.MeshBasicMaterial( { color:0x555555, wireframe:true} ) );
		scene.add( plane );

		this.world.set_delete_projectile_callback( GAME_PAGE_delete_projectile );

		// Save the objects
		this.renderer = renderer;	
		this.scene = scene;
		this.camera = camera;
		
		this.create_skybox();
	}

	this.tick = function( dt ){
		this.world.tick(dt);
		this.world.update_render();
	}
	
	this.handle_keyboard_down = function( event ){	
		var keyCode = 0;

		if( event == null ){
			keyCode = window.event.keyCode;
			window.event.preventDefault();
		}
		else {
			keyCode = event.keyCode;
			event.preventDefault();
		}
		
		if(( GAME_PAGE_DATA.game_state == IN_ROUND_GAME_STATE ) && 
			( keyCode>=37 && keyCode <=40 ) )	{
			var key = 40-keyCode;
			var this_user_id = GAME_PAGE_DATA.this_ship_id;
			
			var forward = undefined;
			var turn = undefined;
			
			if(key == 0 ) forward = -1;
			if(key == 1 ) turn = 1;
			if(key == 2 ) forward = 1;
			if(key == 3 ) turn = -1;
			
			handle_ship_control( GAME_PAGE_DATA.world.ships[this_user_id], forward, turn );
			
			GAME_PAGE_DATA.socket.emit( 'ship control on', 40-keyCode );
		}
	}
	
	this.handle_keyboard_up = function( event ){
		var keyCode = 0;

		if( event == null ){
			keyCode = window.event.keyCode;
			window.event.preventDefault();
		}
		else {
			keyCode = event.keyCode;
			event.preventDefault();
		}
		
		//console.log( 'handle_keyboard_up: ' + keyCode );
		
		if(( GAME_PAGE_DATA.game_state == IN_ROUND_GAME_STATE ) && 
			( keyCode>=37 && keyCode <=40 ) )	{
			var key = 40-keyCode;
			var this_user_id = GAME_PAGE_DATA.this_ship_id;

			var forward = undefined;
			var turn = undefined;
			
			if(key == 0 || key == 2 ) forward = 0;
			if(key == 1 || key == 3 ) turn = 0;
			
			handle_ship_control( GAME_PAGE_DATA.world.ships[this_user_id], forward, turn );
			
			//console.log('Released the key. is forward = ' + GAME.world.ships[this_user_id].forward_value );
			GAME_PAGE_DATA.socket.emit( 'ship control off', 40-keyCode );
		}
		if( ( GAME_PAGE_DATA.game_state == IN_ROUND_GAME_STATE ) && 
			( keyCode == 32 || keyCode == 17 ) ){
			GAME_PAGE_DATA.create_shoot( GAME_PAGE_DATA.this_ship_id );
			GAME_PAGE_DATA.socket.emit( 'ship shot', [GAME_PAGE_DATA.this_ship_id] );
		}
	}
}

function handle_ship_control( ship, forward, turn ){
	if( forward !== undefined ) 
		ship.set_forward( forward );
	if( turn !== undefined ) 	
		ship.set_turn( turn );
	
	if( ship.particle_emitter ){		
		if( forward === 1 ){
			ship.particle_emitter.emitter().start();
		}
		else{
			ship.particle_emitter.emitter().stop();
		}
	}
}
	
function GAME_PAGE_DATA_animate(){
	var timer = new Date().getTime() / 1000;
	var dt = timer - GAME_PAGE_DATA.last_time_t;
	GAME_PAGE_DATA.last_time_t = timer;
	if( dt > 0.033 ) dt = 0.033;
	
	if( !GAME_PAGE_DATA.stop_rendering ){
		GAME_PAGE_DATA.tick( dt );

		if( GAME_PAGE_DATA.this_ship_id != -1 ){
			var this_ship = GAME_PAGE_DATA.world.ships[GAME_PAGE_DATA.this_ship_id];
			if( this_ship ){
				GAME_PAGE_DATA.camera.position.x = -25 * this_ship.dir.x + this_ship.pos.x;
				GAME_PAGE_DATA.camera.position.y = -25 * this_ship.dir.y + this_ship.pos.y;
				//console.log( "updated camera x,y=" + GAME.camera.position.x + ', ' + GAME.camera.position.y );
				GAME_PAGE_DATA.cameraTarget.set( this_ship.pos.x, this_ship.pos.y, this_ship.pos.z );	
				GAME_PAGE_DATA.camera.lookAt( GAME_PAGE_DATA.cameraTarget );
			}
		}
		
		GAME_PAGE_DATA.skyboxCameraTarget.x = GAME_PAGE_DATA.cameraTarget.x - GAME_PAGE_DATA.camera.position.x;
		GAME_PAGE_DATA.skyboxCameraTarget.y = GAME_PAGE_DATA.cameraTarget.z - GAME_PAGE_DATA.camera.position.z;
		GAME_PAGE_DATA.skyboxCameraTarget.z = -( GAME_PAGE_DATA.cameraTarget.y - GAME_PAGE_DATA.camera.position.y );

		GAME_PAGE_DATA.skyboxCameraTarget.normalize();
		
		GAME_PAGE_DATA.skyboxCamera.lookAt( GAME_PAGE_DATA.skyboxCameraTarget );
		
		GAME_PAGE_DATA.renderer.clear();
		
		GAME_PAGE_DATA.renderer.render( GAME_PAGE_DATA.skyboxScene, GAME_PAGE_DATA.skyboxCamera );
		GAME_PAGE_DATA.renderer.render( GAME_PAGE_DATA.scene, GAME_PAGE_DATA.camera );
		GAME_PAGE_DATA.renderer.render( GAME_PAGE_DATA.particlesScene, GAME_PAGE_DATA.camera );		
		
		GAME_PAGE_DATA.stats.update();
		
		requestAnimationFrame( GAME_PAGE_DATA_animate );		
	}
}

var GAME_PAGE_DATA = new GAME_PAGE_DATA_CLASS;


function GAME_PAGE_init_extra_socket_events( game_data ){
	var address = game_data.address;
	var port = game_data.port;
	var access_data = game_data.access_data;
	//address = 'Mef-PC';
	console.log( 'address: ' + address );
	var socket = io.connect(address ,{port:port});
	//var socket = io.connect( '192.168.0.5' ,{port:port});

	socket.on('initially connected', function() {
		console.log('successfully connceted. Starting handshake process');
		socket.emit( 'handshake', access_data );;
	});

	socket.on( 'handshake accepted', function(){
		console.log( 'handshake accepted!' );
	});

	socket.on( 'connected', function( data ){
		console.log('connceted a user');
		var new_user_id = data[0];
		if( GAME_PAGE_DATA.this_ship_id == -1 ){
			GAME_PAGE_DATA.this_ship_id = new_user_id;
			GAME_PAGE_DATA.create_ships_from_server_data(data[1]);
		}
		else{
			var one_user_array = {};
			
			one_user_array[ new_user_id ] = data[1][new_user_id];
			GAME_PAGE_DATA.create_ships_from_server_data( one_user_array );
		}
	});

	socket.on('disconnected', function( data ){
		GAME_PAGE_DATA.scene.remove( GAME_PAGE_DATA.world.ships[data].mesh );
		delete GAME_PAGE_DATA.world.ships[data];
	});

	socket.on( 'update', function( data ){
			for( ship_id in data ){
				var server_ship = data[ship_id];
				var client_ship = GAME_PAGE_DATA.world.ships[ship_id];
				client_ship.set_updated_position( server_ship.pos );
				client_ship.vel			= server_ship.vel;
				client_ship.acc 		= server_ship.acc;
				client_ship.forward_value	= server_ship.forward_value;
				client_ship.turn_value 		= server_ship.turn_value;
				client_ship.set_updated_angle( server_ship.angle );
				client_ship.angular_vel		= server_ship.angular_vel;
				client_ship.life = server_ship.life;
			}
		});
		
	socket.on( 'ship control update', function( data ){
		var ship_id = data[0];
		var forward = data[1];
		var turn = data[2];
		handle_ship_control( GAME_PAGE_DATA.world.ships[ship_id], forward, turn );
	});
		
	socket.on( 'ship shoot event', function( data ){
		GAME_PAGE_DATA.create_shoot( data[0] );
	});
	
	socket.on( 'update game state', function( data ){
		GAME_PAGE_DATA.game_state = data;
	});
	
	GAME_PAGE_DATA.socket = socket;
}

function GAME_PAGE_clear_extra_socket_events(){
	
}

function GAME_PAGE_delete_projectile( id ){
	GAME_PAGE_DATA.scene.remove( GAME_PAGE_DATA.world.projectiles[id].mesh );
}

function enter_game_page( game_data ){
	window.addEventListener('keydown',GAME_PAGE_DATA.handle_keyboard_down,false);
	window.addEventListener('keyup',GAME_PAGE_DATA.handle_keyboard_up,false);

	var div = document.createElement( 'div' );
	document.getElementsByName( 'game_page' )[0].appendChild( div );
	GAME_PAGE_DATA.div = div;
	
	GAME_PAGE_DATA.world = new WorldClass();

	GAME_PAGE_DATA.init_3d_scene();

	GAME_PAGE_DATA_animate();
	GAME_PAGE_init_extra_socket_events( game_data );		
}

function leave_game_page(){
	window.removeEventListener('keydown',GAME_PAGE_DATA.handle_keyboard_down);
	window.removeEventListener('keyup',GAME_PAGE_DATA.handle_keyboard_up);

	GAME_PAGE_clear_extra_socket_events();
	GAME_PAGE_DATA.stop_rendering = true;
	
	document.getElementsByName( 'game_page' )[0].removeChild( GAME_PAGE_DATA.div );
	delete GAME_PAGE_DATA.div;
}
