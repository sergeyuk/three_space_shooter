

var GameClass = function(){
	this.container;
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
	
	this.front_end_socket;
	this.room_socket;
	this.this_ship_id = -1;
	this.page_id = LOGIN_PAGE_ID;
	
	//this.reset = function(){ this = new GameClass; }
}

/*
var materials_array = {
	1 : { map: THREE.ImageUtils.loadTexture( "obj/Gg/Gg.png" ) }
};

var meshes_array = { 
	1 : "obj/Gg/Gg.js"
};*/

var GAME = new GameClass();
GAME.world = new WorldClass();


//init();
//animate();

	function init_front_end_socket_io(){
		var socket = io.connect();

		socket.on('connected', function () {
			
			change_page( LOGIN_PAGE_ID );
			
			console.log('successfully connceted');
			var new_user_id = data[0];
			if( GAME.this_ship_id == -1 ){
				GAME.this_ship_id = new_user_id;
				create_ships_from_server_data(data[1]);
			}
			else{
				var one_user_array = {};
				
				one_user_array[ new_user_id ] = data[1][new_user_id];
				create_ships_from_server_data( one_user_array );
			}
		});

		socket.on('disconnected', function( data ){
			GAME.scene.remove( GAME.world.ships[data].mesh );
			delete GAME.world.ships[data];
		});

		socket.on( 'update', function( data ){
				for( ship_id in data ){
					var server_ship = data[ship_id];
					var client_ship = GAME.world.ships[ship_id];
					client_ship.set_updated_position( server_ship.pos );
					client_ship.vel			= server_ship.vel;
					client_ship.acc 		= server_ship.acc;
					client_ship.forward_value	= server_ship.forward_value;
					client_ship.turn_value 		= server_ship.turn_value;
					client_ship.set_updated_angle( server_ship.angle );
					client_ship.angular_vel		= server_ship.angular_vel;
				}
			});
			
		socket.on( 'ship control update', function( data ){
				var ship_id = data[0];
				var forward = data[1];
				var turn = data[2];
				handle_ship_control( GAME.world.ships[ship_id], forward, turn );
			});
			
		socket.on( 'ship shoot event', function( data ){
			create_shoot( data[0] );
		});
		GAME.front_end_socket = socket;
	}
		
	function init_room_socket_io(){
		var socket = io.connect();

		socket.on('connected', function (data) {
			console.log('successfully connceted');
			var new_user_id = data[0];
			if( GAME.this_ship_id == -1 ){
				GAME.this_ship_id = new_user_id;
				create_ships_from_server_data(data[1]);
			}
			else{
				var one_user_array = {};
				
				one_user_array[ new_user_id ] = data[1][new_user_id];
				create_ships_from_server_data( one_user_array );
			}
		});

		socket.on('disconnected', function( data ){
			GAME.scene.remove( GAME.world.ships[data].mesh );
			delete GAME.world.ships[data];
		});

		socket.on( 'update', function( data ){
				for( ship_id in data ){
					var server_ship = data[ship_id];
					var client_ship = GAME.world.ships[ship_id];
					client_ship.set_updated_position( server_ship.pos );
					client_ship.vel			= server_ship.vel;
					client_ship.acc 		= server_ship.acc;
					client_ship.forward_value	= server_ship.forward_value;
					client_ship.turn_value 		= server_ship.turn_value;
					client_ship.set_updated_angle( server_ship.angle );
					client_ship.angular_vel		= server_ship.angular_vel;
				}
			});
			
		socket.on( 'ship control update', function( data ){
				var ship_id = data[0];
				var forward = data[1];
				var turn = data[2];
				handle_ship_control( GAME.world.ships[ship_id], forward, turn );
			});
			
		socket.on( 'ship shoot event', function( data ){
			create_shoot( data[0] );
		});
		GAME.room_socket = socket;
	}

	function create_skybox(){
		var path = "textures/skybox/";
		var format = '.jpg';
		var urls = [
				path + 'px' + format, path + 'nx' + format,
				path + 'py' + format, path + 'ny' + format,
				path + 'pz' + format, path + 'nz' + format
			];

		GAME.reflectionCube = THREE.ImageUtils.loadTextureCube( urls );
		
		var shader = THREE.ShaderUtils.lib[ "cube" ];
		shader.uniforms[ "tCube" ].texture = GAME.reflectionCube;

		var material = new THREE.ShaderMaterial( {

			fragmentShader: shader.fragmentShader,
			vertexShader: shader.vertexShader,
			uniforms: shader.uniforms,
			depthWrite: false

		} );

		var mesh = new THREE.Mesh( new THREE.CubeGeometry( 100, 100, 100 ), material );
		mesh.flipSided = true;
		GAME.skyboxScene.add( mesh );
	}

	function create_shoot( owner_ship_id ){
		GAME.world.add_shot( owner_ship_id );
		create_projectile_mesh( GAME.world.projectiles.length - 1 );	
	}

	function create_projectile_mesh( projectile_id ){
		var projectile_mesh = new THREE.Mesh( new THREE.SphereGeometry( 1, 32, 16 ), new THREE.MeshBasicMaterial( { color:0xFF0000, wireframe:false} ) );
		GAME.scene.add( projectile_mesh );
		if( GAME.world.projectiles.length > projectile_id ){
			GAME.world.projectiles[projectile_id].mesh = projectile_mesh;
		}
		else{
			alert( 'wrong projectile ID passed' );
		}
	}
	
	function delete_projectile( id ){
		GAME.scene.remove( GAME.world.projectiles[id].mesh );
	}

	
	/* three.ex.js + sparks approach */
	function create_sparks_particles(){
		var sparks	= new THREEx.Sparks({
				maxParticles	: 50,
				counter		: new SPARKS.SteadyCounter(20),
				//texture		: THREE.ImageUtils.loadTexture("./images/tremulous/damage/blood.jpg"),
				//texture		: THREE.ImageUtils.loadTexture("./images/tremulous/lcannon/primary_4.jpg"),
				//texture		: THREE.ImageUtils.loadTexture("./images/tremulous/marks/burn_mrk.jpg"),
				//texture		: THREE.ImageUtils.loadTexture("./images/tremulous/blaster/orange_particle.jpg"),
			});
		sparks.initializer	= {
			color	: function(value){
				sparks.emitter().addInitializer(new THREEx.SparksPlugins.InitColor(value));
				return sparks.initializer;
			},
			size	: function(value){
				sparks.emitter().addInitializer(new THREEx.SparksPlugins.InitSize(value));
				return sparks.initializer;
			},
			lifeTime: function(minValue, maxValue){
				sparks.emitter().addInitializer(new SPARKS.Lifetime(minValue, maxValue));
				return sparks.initializer;
			}
		};
		
		// setup the emitter
		var emitter	= sparks.emitter();

		var originalColor	= new THREE.Color().setRGB(0.5,0.3,0);
		var originalSize	= 20;

		sparks.initializer.color(originalColor).size(originalSize).lifeTime(0.4, 1);
		
		emitter.addInitializer(new SPARKS.Position( new SPARKS.PointZone( new THREE.Vector3(0,0,0) ) ) );
		emitter.addInitializer(new SPARKS.Velocity(new SPARKS.PointZone(new THREE.Vector3(0,3,0))));		
		
		emitter.addAction(new SPARKS.Age());
		emitter.addAction(new SPARKS.Move());
		emitter.addAction(new THREEx.SparksPlugins.ActionLinearColor(originalColor, new THREE.Color().setRGB(0,0,0.6), 1));
		emitter.addAction(new THREEx.SparksPlugins.ActionLinearSize(originalSize, originalSize/4, 1));
		emitter.addAction(new SPARKS.RandomDrift(5,0,5));

		return sparks;
	}
	
	function create_particle_system(){	
		var particle_emitter = create_sparks_particles();
		GAME.particlesScene.add( particle_emitter.container() );
		return particle_emitter;
	}
	
	function init_3d_rendering() {
		GAME.container = document.createElement( 'div' );
		document.body.appendChild( GAME.container );

		GAME.stats = new Stats();
		GAME.stats.domElement.style.position = 'absolute';
		GAME.stats.domElement.style.top = '10px';
		GAME.container.appendChild( GAME.stats.domElement );

		GAME.camera = new THREE.CombinedCamera( window.innerWidth, window.innerHeight, 45, 1, 10000, -2000, 10000 );
		GAME.camera.position.set( 0, -15, 10 );
		GAME.camera.up.x = GAME.camera.up.y = 0;
		GAME.camera.up.z = 1;
		GAME.cameraTarget = new THREE.Vector3(0,0,0); 
		GAME.camera.lookAt( GAME.cameraTarget );

		GAME.skyboxCamera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 100 );
		GAME.skyboxCameraTarget = new THREE.Vector3( 0, 0, 0 );

		GAME.scene = new THREE.Scene();
		GAME.scene.add( GAME.camera );
		
		GAME.skyboxScene = new THREE.Scene();
		GAME.skyboxScene.add( GAME.skyboxCamera );
		
		GAME.particlesScene = new THREE.Scene();
		
		GAME.renderer = new THREE.WebGLRenderer({ antialias : true, clearAlpha: 1 });
		GAME.renderer.setSize(window.innerWidth, window.innerHeight);
		GAME.renderer.autoClear = false;
		
		GAME.container.appendChild( GAME.renderer.domElement );
		
		GAME.ambientLight = new THREE.AmbientLight( 0x111111 );
		GAME.scene.add( GAME.ambientLight );
		
		GAME.pointLight = new THREE.PointLight( 0xFFFFFF );		
		GAME.pointLight.position.set( 10, 50, 130 );
		GAME.scene.add(GAME.pointLight);
		
		GAME.directionalLight = new THREE.DirectionalLight( 0xffffff );
		GAME.directionalLight.position.set( 10, 50, 130 ).normalize();
		GAME.scene.add( GAME.directionalLight );

		var plane = new THREE.Mesh( new THREE.PlaneGeometry(1000,1000,20,20), new THREE.MeshBasicMaterial( { color:0x555555, wireframe:true} ) );

		GAME.scene.add( plane );

		window.addEventListener('keydown',handle_keyboard_down,false);
		window.addEventListener('keyup',handle_keyboard_up,false);
		
		GAME.world.set_delete_projectile_callback( delete_projectile );
		
		create_skybox();
		create_flags();
	}
	
	function create_flags(){
		var flag_mesh_name = "obj/flag/Flag.js";
		var flag_normal_map = THREE.ImageUtils.loadTexture( "obj/flag/Flag_NRM.jpg" );
		var flag_diffuse_texture_paths = [ "obj/flag/FlagR.jpg", "obj/flag/FlagB.jpg" ];
		
		var flag_platform_mesh_name = "obj/flag_platform/Flag_Platform.js";
		var flag_platform_normal_map = THREE.ImageUtils.loadTexture( "obj/flag_platform/Flag_Platform_NRM.jpg" );
		var flag_platform_diffuse_texture = THREE.ImageUtils.loadTexture( "obj/flag_platform/Flag_Platform.jpg" );
		
		var flag_positions = [ {x:10,y:10,z:0}, {x:-10,y:0,z:0} ];
		
		for( var i = 0; i < 2; i++ ){
			GAME.world.flags[i] = new FlagClass();
			GAME.world.flag_platforms[i] = new FlagPlatformClass();
			
			(function ( index ){				
				var material = create_normal_map_material( THREE.ImageUtils.loadTexture( flag_diffuse_texture_paths[index] ), flag_normal_map );
				
				var loader = new THREE.JSONLoader();	
				loader.load( flag_mesh_name, function( geometry ) { 
					geometry.computeTangents();
					
					var mesh = new THREE.Mesh( geometry, material );
					GAME.scene.add(mesh);
					mesh.position.set( flag_positions[index].x, flag_positions[index].y, flag_positions[index].z );
					
					GAME.world.flags[index].mesh = mesh;
					
				} );
			})( i );
			
			(function ( index ){				
				var material = create_normal_map_material( flag_platform_diffuse_texture, flag_platform_normal_map );
				
				var loader = new THREE.JSONLoader();	
				loader.load( flag_platform_mesh_name, function( geometry ) { 
					geometry.computeTangents();
					
					var mesh = new THREE.Mesh( geometry, material );
					GAME.scene.add(mesh);
					mesh.position.set( flag_positions[index].x, flag_positions[index].y, flag_positions[index].z );
					
					GAME.world.flag_platforms[index].mesh = mesh;
				} );
			})( i );
		}
	}

	function create_ships_from_server_data( data ){
		for( client_id in data ){
			GAME.world.ships[client_id] = new ShipClass();
			load_ship( client_id, data[client_id] );
		}
	}

	function create_normal_map_material( diffuse_texture, normal_map_texture ){
		var ambient = 0x111111, diffuse = 0xaaaaaa, specular = 0x7f7f7f, shininess = 20;

		var shader = THREE.ShaderUtils.lib[ "normal" ];
		var uniforms = THREE.UniformsUtils.clone( shader.uniforms );

		uniforms[ "tNormal" ].texture = normal_map_texture;
		uniforms[ "tDiffuse" ].texture = diffuse_texture;

		uniforms[ "enableAO" ].value = false;
		uniforms[ "enableDiffuse" ].value = true;
		uniforms[ "enableSpecular" ].value = false;
		uniforms[ "enableReflection" ].value = true;

		uniforms[ "uDiffuseColor" ].value.setHex( diffuse );
		uniforms[ "uSpecularColor" ].value.setHex( specular );
		uniforms[ "uAmbientColor" ].value.setHex( ambient );

		uniforms[ "uShininess" ].value = shininess;

		uniforms[ "tCube" ].texture = GAME.reflectionCube;
		uniforms[ "uReflectivity" ].value = 0.1;

		var parameters = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShader, uniforms: uniforms, lights: true, fog: false };
		var material = new THREE.ShaderMaterial( parameters );
		return material;
	}
	
	function create_standard_diffuse_material( diffuse_texture ){
		return new THREE.MeshLambertMaterial( { map: diffuse_texture, transparent: true } );
	}
	
	function load_ship( client_id, server_obj ){
		var new_ship = GAME.world.ships[client_id];
		new_ship.set_position( server_obj.pos );

		var mesh_id = server_obj.mesh;
		
		new_ship.material = create_normal_map_material( THREE.ImageUtils.loadTexture( "obj/Gg/Gg.png" ), THREE.ImageUtils.loadTexture( "obj/Gg/Gg_NRM.jpg" ) );
			
		var loader = new THREE.JSONLoader();	
		loader.load( meshes_array[mesh_id], function( geometry ) { 
			geometry.computeTangents();

			new_ship.mesh = new THREE.Mesh( geometry, new_ship.material );
			GAME.scene.add(new_ship.mesh);
			new_ship.mesh.position.set( new_ship.pos.x, new_ship.pos.y, new_ship.pos.z );
			
			new_ship.particle_emitter = create_particle_system();
			//new_ship.particle_emitter.offset = new Three.Vector3();
			new_ship.particle_emitter.container().rotation.z = Math.PI;
		} );
	}
	
	var last_time_t = 0;
	
	function animate() {
		var timer = new Date().getTime() / 1000;
		var dt = timer - last_time_t;
		last_time_t = timer;
		if( dt > 0.033 ) dt = 0.033;
		tick( dt );

		if( GAME.this_ship_id != -1 ){
			var this_ship = GAME.world.ships[GAME.this_ship_id];
			if( this_ship ){
				GAME.camera.position.x = -25 * this_ship.dir.x + this_ship.pos.x;
				GAME.camera.position.y = -25 * this_ship.dir.y + this_ship.pos.y;
				//console.log( "updated camera x,y=" + GAME.camera.position.x + ', ' + GAME.camera.position.y );
				GAME.cameraTarget.set( this_ship.pos.x, this_ship.pos.y, this_ship.pos.z );	
				GAME.camera.lookAt( GAME.cameraTarget );
			}
		}
		
		GAME.skyboxCameraTarget.x = GAME.cameraTarget.x - GAME.camera.position.x;
		GAME.skyboxCameraTarget.y = GAME.cameraTarget.z - GAME.camera.position.z;
		GAME.skyboxCameraTarget.z = -( GAME.cameraTarget.y - GAME.camera.position.y );

		GAME.skyboxCameraTarget.normalize();
		
		GAME.skyboxCamera.lookAt( GAME.skyboxCameraTarget );
		
		GAME.renderer.clear();
		
		GAME.renderer.render( GAME.skyboxScene, GAME.skyboxCamera );
		GAME.renderer.render( GAME.scene, GAME.camera );
		GAME.renderer.render( GAME.particlesScene, GAME.camera );		
		
		GAME.stats.update();
		requestAnimationFrame( animate );
	}

	function tick( dt ){
		GAME.world.tick(dt);
		GAME.world.update_render();
	}

	function handle_keyboard_down(event){
		var keyCode = 0;

		if( event == null ){
			keyCode = window.event.keyCode;
			window.event.preventDefault();
		}
		else {
			keyCode = event.keyCode;
			event.preventDefault();
		}
		if(keyCode>=37 && keyCode <=40)	{
			var key = 40-keyCode;
			var this_user_id = GAME.this_ship_id;
			
			var forward = undefined;
			var turn = undefined;
			
			if(key == 0 ) forward = -1;
			if(key == 1 ) turn = 1;
			if(key == 2 ) forward = 1;
			if(key == 3 ) turn = -1;
			
			handle_ship_control( GAME.world.ships[this_user_id], forward, turn );
			
			GAME.socket.emit( 'ship control on', 40-keyCode );
		}
		
		//console.log( keyCode );
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
	
	function handle_keyboard_up(event){
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
		
		if(keyCode>=37 && keyCode <=40)	{
			var key = 40-keyCode;
			var this_user_id = GAME.this_ship_id;

			var forward = undefined;
			var turn = undefined;
			
			if(key == 0 || key == 2 ) forward = 0;
			if(key == 1 || key == 3 ) turn = 0;
			
			handle_ship_control( GAME.world.ships[this_user_id], forward, turn );
			
			//console.log('Released the key. is forward = ' + GAME.world.ships[this_user_id].forward_value );
			GAME.socket.emit( 'ship control off', 40-keyCode );
		}
		if( keyCode == 32 || keyCode == 17 ){
			create_shoot( GAME.this_ship_id );
			GAME.socket.emit( 'ship shot', [GAME.this_ship_id] );
		}
	}

