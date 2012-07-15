var SHIP_STATUS_ALIVE = 0;
var SHIP_STATUS_DEAD = 1;

var ShipClass = function(){
	this.material;
	this.mesh;
	this.dir		= {x:0,y:1,z:0};
	this.correction_dir	= {x:0,y:0,z:0};
	this.correction_length 	= 0;

	this.pos		= {x:0,y:0,z:0};
	this.vel		= 0;//[0,0,0];
	this.acc 		= 0;//[0,0,0];

	this.angle		= 0;
	this.delta_angle	= 0;
	this.angular_vel	= 0;

	this.turning_angle_deg = 0;
	this.max_turning_angle_deg = 45;
	
	this.forward_value	= 0;
	this.turn_value		= 0;

	this.life = 100;

	this.particle_emitter;
	
	this.status = SHIP_STATUS_DEAD; // Dead by default, requires 'spawn'
	
	this.set_updated_angle = function( new_angle ){
		//this.delta_angle = new_angle - this.angle;
		this.angle = new_angle;
	};

	this.is_alive = function(){
		return this.status == SHIP_STATUS_ALIVE;
	}

	this.set_alive = function(){
		this.status = SHIP_STATUS_ALIVE;
	}

	this.apply_angle_correction = function( dt ){
		if( this.delta_angle != 0 ){
			var sign = this.delta_angle < 0 ? -1 : 1;
			var correction_angular_speed = 60.0 + this.delta_angle;
			var abs_angle = Math.abs( this.delta_angle );
			var value_to_change = correction_angular_speed * dt;
			value_to_change = Math.min( value_to_change, abs_angle );
			value_to_change *= sign;
			this.angle += value_to_change;
			this.delta_angle -= value_to_change;
		}
	};

	this.set_updated_position = function( new_pos ){
		//compute correction dir and length
		var dir = {};
		dir.x = new_pos.x - this.pos.x;
		dir.y = new_pos.y - this.pos.y;
		dir.z = new_pos.z - this.pos.z;

		var length = veclen( dir );

		if( length > 0 ){
			dir.x = (dir.x / length ); 
			dir.y = (dir.y / length ); 
			dir.z = (dir.z / length );
		}
		this.correction_dir = dir;
		this.correction_length = length;
	};

	this.apply_pos_correction = function( dt ){
		if( this.correction_length > 0 ){
			//console.log( "correction length: " + this.correction_length );
			var correction_speed = 8.0 + this.correction_length;
			
			var new_pos = {};
			new_pos.x = this.pos.x + this.correction_dir.x * correction_speed * dt;
			new_pos.y = this.pos.y + this.correction_dir.y * correction_speed * dt;
			new_pos.z = this.pos.z + this.correction_dir.z * correction_speed * dt;

			var delta_vec = {};
			delta_vec.x = new_pos.x - this.pos.x;			
			delta_vec.y = new_pos.y - this.pos.y;
			delta_vec.z = new_pos.z - this.pos.z;
			
			var delta_vec_len = veclen( delta_vec );

			if( delta_vec_len > this.correction_length || ((this.correction_length - delta_vec_len) < 0.1) ){
				this.pos.x += this.correction_dir.x * this.correction_length;
				this.pos.y += this.correction_dir.y * this.correction_length;
				this.pos.z += this.correction_dir.z * this.correction_length;				
				this.correction_length = 0;
			}
			else{
				this.pos.x = new_pos.x;
				this.pos.y = new_pos.y;
				this.pos.z = new_pos.z;
				this.correction_length -= delta_vec_len;
			}
		}		 
	};

	this.tick_position = function( dt ){
		var forward_acceleration = 21.0;
		var friction_acceleration = 0.3 * this.vel;
		this.acc = forward_acceleration * this.forward_value - friction_acceleration;		

		this.vel = this.vel + this.acc * dt;
		if( this.vel < 0.2 && this.forward_value != 1 ){
			this.vel = 0;
			this.acc = 0;
		}

		this.apply_pos_correction( dt );

		this.pos.x = this.pos.x + this.dir.x * this.vel * dt;
		this.pos.y = this.pos.y + this.dir.y * this.vel * dt;
		this.pos.z = this.pos.z + this.dir.z * this.vel * dt;
	}

	this.tick_rotation = function( dt ) {
		this.apply_angle_correction( dt );

		var turn_speed = 60.0;
		this.angular_vel = turn_speed * this.turn_value;
		this.angle += this.angular_vel * dt;

		if( this.turn_value == 1 || this.turn_value == -1 ){
			var speed_multiplier = ( ( this.turning_angle_deg < 0 && this.turn_value == 1 ) || ( this.turning_angle_deg > 0 && this.turn_value == -1 ) ) ? 2 : 1;
			this.turning_angle_deg += this.turn_value * speed_multiplier * turn_speed * dt;
			if( this.turn_value == 1 )
				this.turning_angle_deg = Math.min( this.turning_angle_deg, this.max_turning_angle_deg );
			else
				this.turning_angle_deg = Math.max( this.turning_angle_deg, -this.max_turning_angle_deg );
		}
		else if( this.turn_value == 0 ){
			if( this.turning_angle_deg > 0 ){
				this.turning_angle_deg = Math.max( this.turning_angle_deg - 2 * turn_speed * dt, 0 );
			}
			else if( this.turning_angle_deg < 0 ){
				this.turning_angle_deg = Math.min( this.turning_angle_deg + 2 * turn_speed * dt, 0 );
			}
		}
		
		this.update_dir_vector();
	}

	this.update_dir_vector = function(){
		this.dir.x = Math.sin( this.angle * Math.PI / 180 )
		this.dir.y = Math.cos( this.angle * Math.PI / 180 );
	}

	this.tick = function( dt ){
		if( this.status != SHIP_STATUS_ALIVE ){
			this.forward_value	= 0;
			this.turn_value		= 0;			
		}
		this.tick_rotation( dt );		
		this.tick_position( dt );
	}

	this.update_render = function(){
		if( this.mesh ){
			this.mesh.position.set( this.pos.x, this.pos.y, this.pos.z );
			this.mesh.rotation.z = -this.angle * Math.PI / 180;
			this.mesh.rotation.y = Math.cos( this.angle * Math.PI / 180 ) * ( this.turning_angle_deg * Math.PI / 180 );
			this.mesh.rotation.x = Math.sin( this.angle * Math.PI / 180 ) * ( this.turning_angle_deg * Math.PI / 180 );
		}
		
		if( this.particle_emitter ){
			this.particle_emitter.update();
			this.particle_emitter.container().position.set( this.pos.x, this.pos.y, this.pos.z );
			this.particle_emitter.container().rotation.z = Math.PI - this.angle * Math.PI / 180;
		}
	}

	this.set_position = function( _pos )	{ this.pos.x = _pos.x; this.pos.y = _pos.y; this.pos.z = _pos.z;}
	this.get_position = function()		{ return this.pos; }
	this.get_velocity = function()		{ return this.vel; }
	this.get_acceleration = function() 	{ return this.acc; }
	this.get_direction = function() 	{ return this.dir; }
	this.set_forward = function( fwd_value) { this.forward_value = fwd_value; }
	this.set_turn = function( turn_val )	{ this.turn_value = turn_val; }
	this.get_forward = function() { return this.forward_value; }
	this.get_turn = function()	{ return this.turn_value; }
}

try{
	exports.ShipClass = ShipClass;
	global.ShipClass = ShipClass;
}
catch(e){}
