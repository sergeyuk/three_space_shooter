var MAIN_PAGE_DATA_CLASS = function(){
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
		var div = this.div;
		
		// Create camera
		var camera = new THREE.CombinedCamera( div.scrollWidth, div.scrollHeight, 45, 1, 10000, -2000, 10000 );
		camera.position.set( 0, 15, 5 );
		camera.up.x = camera.up.y = 0;
		camera.up.z = 1;
		camera.lookAt( new THREE.Vector3( 0,0,0 ) );
		
		// Create scene
		var scene = new THREE.Scene();
		scene.add( camera );
		
		// Setup canvas
		var renderer = new THREE.WebGLRenderer({ antialias : true, clearAlpha: 1 });
		renderer.setSize( div.scrollWidth, div.scrollHeight );
		renderer.autoClear = false;
		div.appendChild( renderer.domElement );
			
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
};

function MAIN_PAGE_DATA_animate(){
	var timer = new Date().getTime() / 1000;
	var dt = timer - MAIN_PAGE_DATA.last_time_t;
	MAIN_PAGE_DATA.last_time_t = timer;
	if( dt > 0.033 ) dt = 0.033;
	
	if( !MAIN_PAGE_DATA.stop_rendering ){
		MAIN_PAGE_DATA.tick( dt );
		
		MAIN_PAGE_DATA.renderer.clear();			
		MAIN_PAGE_DATA.renderer.render( MAIN_PAGE_DATA.scene, MAIN_PAGE_DATA.camera );
		requestAnimationFrame( MAIN_PAGE_DATA_animate );		
	}
}

function MAIN_PAGE_join_room_button_click(){
	CLIENT_STATE.front_end_socket.emit( 'join room request' );
}

function MAIN_PAGE_init_extra_socket_events(){
	CLIENT_STATE.front_end_socket.on( 'chat msg', function( data ){
		MAIN_PAGE_add_chat_message( data[0], data[1] );
	});
}

function MAIN_PAGE_add_chat_message( from, text ){
	var chat_box = $('#main_page_chat_box')[0];
    chat_box.addText(from + ": " + text);
}

function MAIN_PAGE_send_chat_message_button_click(){
	var input_box = $('#main_page_chat_input')[0];
	var message = input_box.value;
	if( message.length > 0 ){
		MAIN_PAGE_add_chat_message( CLIENT_STATE.user_object.name, message );
		input_box.value = '';
		CLIENT_STATE.front_end_socket.emit( 'chat msg', message )
	}
}

function MAIN_PAGE_clear_extra_socket_events(){
	//CLIENT_STATE.front_end_socket.on( 'chat msg' );	
}

var MAIN_PAGE_DATA = new MAIN_PAGE_DATA_CLASS;

function enter_main_page( user_object ){
	var join_button = $( '#main_page_join_room_button' )[0];
	join_button.onmouseup = MAIN_PAGE_join_room_button_click;
	
	var send_button = $( '#main_page_chat_send_button' )[0];
	send_button.onmouseup = MAIN_PAGE_send_chat_message_button_click;
	
	MAIN_PAGE_DATA.div = $( '#main_page_3d_div' )[0];
	CLIENT_STATE.user_object = user_object;
	
	MAIN_PAGE_DATA.init_3d_scene();
	MAIN_PAGE_DATA.load_ship();
	MAIN_PAGE_DATA_animate();
	
	MAIN_PAGE_init_extra_socket_events();
}

function leave_main_page(){
	MAIN_PAGE_clear_extra_socket_events();
	MAIN_PAGE_DATA.stop_rendering = true;
}
