var CREATE_NEW_USER_PAGE_DATA_CLASS = function(){
	this.div;
	this.camera;
	this.scene;
	this.renderer;
	this.last_time_t = 0;
	this.stop_rendering = false;
	this.ship_meshes = [];
	this.ships_num_total = 1;
	this.ships_left_to_load = this.ships_num_total;
	this.current_ship = 0;
	
	this.change_ship = function( ship_id ){
		if( ship_id != this.current_ship ){
			this.scene.remove( this.ship_meshes[this.current_ship] );
		}
		this.current_ship = ship_id;
		this.scene.add( this.ship_meshes[this.current_ship] );
	}
	 
	this.load_ships = function(){
		var ships_num_total = 1;
		var that = this;
		for( var i = 0; i < ships_num_total; i++ ){
			load_ship_geometry( i, function( geometry, material ){
				var mesh = new THREE.Mesh( geometry, material );
				that.ship_meshes.push( mesh );
				mesh.position.set( 0, 0, 0 );
				
				that.ships_left_to_load--;
				
				if( that.ships_left_to_load == 0 ){
					that.change_ship( that.current_ship );
				}
			});
		}
	}
	
	this.init_3d_scene = function(){
		var div = this.div;
		
		// Create camera
		var camera = new THREE.CombinedCamera( div.scrollWidth, div.scrollHeight, 45, 1, 10000, -2000, 10000 );
		camera.position.set( 0, -15, 10 );
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
		
		// Test plance
		var plane = new THREE.Mesh( new THREE.PlaneGeometry(1000,1000,20,20), new THREE.MeshBasicMaterial( { color:0x555555, wireframe:true} ) );
		scene.add( plane );

		// Save the objects
		this.renderer = renderer;	
		this.scene = scene;
		this.camera = camera;
	}
	
	this.tick = function( dt ){
		// rotate camera
	}
};

function CREATE_NEW_USER_PAGE_DATA_animate(){
	var timer = new Date().getTime() / 1000;
	var dt = timer - CREATE_NEW_USER_PAGE_DATA.last_time_t;
	CREATE_NEW_USER_PAGE_DATA.last_time_t = timer;
	if( dt > 0.033 ) dt = 0.033;
	
	if( !CREATE_NEW_USER_PAGE_DATA.stop_rendering ){
		CREATE_NEW_USER_PAGE_DATA.tick( dt );
		
		CREATE_NEW_USER_PAGE_DATA.renderer.clear();			
		CREATE_NEW_USER_PAGE_DATA.renderer.render( CREATE_NEW_USER_PAGE_DATA.scene, CREATE_NEW_USER_PAGE_DATA.camera );
		requestAnimationFrame( CREATE_NEW_USER_PAGE_DATA_animate );		
	}
} 

var CREATE_NEW_USER_PAGE_DATA = new CREATE_NEW_USER_PAGE_DATA_CLASS;

function on_create_new_user_prev_button_click(){
	
}

function on_create_new_user_next_button_click(){
	
}

function enter_create_new_user_page(){
	CREATE_NEW_USER_PAGE_DATA.div = $( 'div[name=create_new_user_3d_view]' )[0];
	
	var prev_button = $( 'button[name=create_new_user_prev_ship]' )[0];
	prev_button.onmouseup = on_create_new_user_prev_button_click;
	
	var next_button = $( 'button[name=create_new_user_next_ship]' )[0];
	next_button.onmouseup = on_create_new_user_next_button_click;
	
	CREATE_NEW_USER_PAGE_DATA.init_3d_scene();
	CREATE_NEW_USER_PAGE_DATA.load_ships();
	CREATE_NEW_USER_PAGE_DATA_animate();
}

function leave_create_new_user_page(){
	CREATE_NEW_USER_PAGE_DATA.stop_rendering = true;
	//delete CREATE_NEW_USER_PAGE_DATA;
}
