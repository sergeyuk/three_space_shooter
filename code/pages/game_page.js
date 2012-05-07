var GAME_PAGE_DATA_CLASS = function(){
	this.div;
	this.camera;
	this.scene;
	this.renderer;
	this.last_time_t = 0;
	this.stop_rendering = false;
	this.ship_meshes = [];
	
	this.camera_angle = 0.0;

	this.load_ship = function(){
		var that = this;
		var ship_id = CLIENT_STATE.user_object.ship;
		load_ship_geometry( ship_id, function( geometry, material ){
			var mesh = new THREE.Mesh( geometry, material );
			that.ship_meshes.push( mesh );
			mesh.position.set( 0, 0, 0 );
			that.scene.add( mesh );
		});
	}
	
	this.init_3d_scene = function(){
		var width = window.innerWidth,
			height = window.innerHeight;
		
		// Create camera
		var camera = new THREE.CombinedCamera( width, height, 45, 1, 10000, -2000, 10000 );
		camera.position.set( 0, 15, 5 );
		camera.up.x = camera.up.y = 0;
		camera.up.z = 1;
		camera.lookAt( new THREE.Vector3( 0,0,0 ) );
		
		// Create scene
		var scene = new THREE.Scene();
		scene.add( camera );
		
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

		// Save the objects
		this.renderer = renderer;	
		this.scene = scene;
		this.camera = camera;
	}

	this.tick = function( dt ){
		// rotate camera
		var camera_distance = 15;
		var camera_rotate_speed = 0.5;
		this.camera_angle += camera_rotate_speed * dt;
		if( this.camera_angle > Math.PI * 2.0 ){
			this.camera_angle -= Math.PI * 2.0;
		}
		
		this.camera.position.x = camera_distance * Math.sin( this.camera_angle );
		this.camera.position.y = camera_distance * Math.cos( this.camera_angle );
		this.camera.lookAt( new THREE.Vector3( 0,0,0 ) );
	}
	
}

function GAME_PAGE_DATA_animate(){
	var timer = new Date().getTime() / 1000;
	var dt = timer - GAME_PAGE_DATA.last_time_t;
	GAME_PAGE_DATA.last_time_t = timer;
	if( dt > 0.033 ) dt = 0.033;
	
	if( !GAME_PAGE_DATA.stop_rendering ){
		GAME_PAGE_DATA.tick( dt );
		
		GAME_PAGE_DATA.renderer.clear();			
		GAME_PAGE_DATA.renderer.render( GAME_PAGE_DATA.scene, GAME_PAGE_DATA.camera );
		requestAnimationFrame( GAME_PAGE_DATA_animate );		
	}
}

var GAME_PAGE_DATA = new GAME_PAGE_DATA_CLASS;


function GAME_PAGE_init_extra_socket_events(){
	CLIENT_STATE.front_end_socket.on( 'chat', function(){
		
	});
}

function GAME_PAGE_clear_extra_socket_events(){
	CLIENT_STATE.front_end_socket.on( 'chat' );	
}

function enter_game_page( game_data ){
	var div = document.createElement( 'div' );
	document.getElementsByName( 'game_page' )[0].appendChild( div );
	GAME_PAGE_DATA.div = div;
	
	GAME_PAGE_DATA.init_3d_scene();
	GAME_PAGE_DATA.load_ship();
	GAME_PAGE_DATA_animate();
	
	GAME_PAGE_init_extra_socket_events();
}

function leave_game_page(){
	GAME_PAGE_clear_extra_socket_events();
	GAME_PAGE_DATA.stop_rendering = true;
	
	document.getElementsByName( 'game_page' )[0].removeChild( GAME_PAGE_DATA.div );
	delete GAME_PAGE_DATA.div;
}
