

var WorldClass = function(){
	this.ships = {};
	this.projectiles = [];
	this.flags = [];
	this.flag_platforms = [];
	
	this.tick = function( dt ){		
		for( var ship in this.ships ){
			this.ships[ship].tick( dt );
		}
		
		var should_clear_projectiles_array = false;
		
		for( var i = 0; i < this.projectiles.length; i++ ){
			if( this.projectiles[i].tick( dt ) == 1 ){
				this.on_delete_projectile_callback ? this.on_delete_projectile_callback( i ) : 0;
				delete this.projectiles[i];
				should_clear_projectiles_array = true;
			}
		}
		
		if( should_clear_projectiles_array ){
			var old_len = this.projectiles.length;
			var newArr = new Array();for (k in this.projectiles) if(this.projectiles[k]) newArr.push(this.projectiles[k])
			this.projectiles = newArr;
			var new_len = this.projectiles.length;
			console.log( 'cleared some projectiles. old len: ' + old_len + ', new len: ' + new_len );
		}
		
		for( var i = 0; i < this.flags.length; i++ ){
			this.flags[i].tick( dt );
		}
		
		this.tick_collision( dt );
	}
	
	
	this.on_delete_projectile_callback;
	this.on_ship_ship_collision_callback;
	this.on_ship_projectile_collision_callback;
	
	this.set_ship_ship_collision_callback 		= function( callback ){ this.on_ship_ship_collision_callback = callback; }
	this.set_ship_projectile_collision_callback = function( callback ){ this.on_ship_projectile_collision_callback = callback; }
	this.set_delete_projectile_callback 		= function( callback ){ this.on_delete_projectile_callback = callback; }
	
	this.tick_collision = function( dt ){
		var ships = this.ships;
		var ship_ids = [];
		
		for( ship_id in ships ){ 
			ship_ids.push( ship_id ); 
		}
		
		var total_ships_num = ship_ids.length;
		
		for( var i = 0; i < total_ships_num; i++ ){
			var ship1_id = ship_ids[i];
			var ship1 = ships[ ship1_id ];
			
			for( var j = i + 1; j < total_ships_num; j++ ){
				var ship2 = ships[ ship_ids[j] ];
				var sq_distance = compute_sq_distance( ship1.get_position(), ship2.get_position() );
				//console.log( 'ship/ship. sq_distance=' + sq_distance );
				
				if( sq_distance < 4 ){
					this.onShipShipCollisionCallback ? this.onShipShipCollisionCallback( ship1, ship2 ) : 0;
					console.log( 'ship/ship collision happened.' );
					break;
				}
			}
			
			for( var j = 0; j < this.projectiles.length; j++ ){
				var projectile = this.projectiles[j];
				if( projectile.owner_id != ship1_id ){
					var sq_distance = compute_sq_distance( ship1.get_position(), projectile.pos );
					if( sq_distance < 4 ){
						this.onShipProjectileCollisionCallback ? this.onShipProjectileCollisionCallback( ship1, projectile ) : 0;
						console.log( 'ship/projectile collision' );
						break;
					}
				}
			}
			
			for( var j = 0; j < this.flags.length; j++ ){
				var flag = this.flags[j];
				//if( flag.team_id  != ship1.team_id ) {
				//}
			}
		}
	}
	
	this.update_render = function(){
		for( var ship in this.ships ){
			this.ships[ship].update_render();
		}
		
		for( var i = 0; i < this.projectiles.length; i++ ){
			this.projectiles[i].update_render();
		}
	}
	
	this.add_projectile = function( pos, dir, type, owner_id ){
		var p = new ProjectileClass();
		p.dir = dir;
		p.pos = pos;
		p.vel = 50.0; // depends on type
		p.max_len = 300;// depends on type
		p.owner_id = owner_id;
		p.start = {x:pos.x, y:pos.y, z:pos.z};
		
		this.projectiles.push( p );
	}
	
	this.add_shot = function( ship_id ){
		if( this.ships.hasOwnProperty( ship_id ) ){
			var ship = this.ships[ship_id];
			
			var pos = ship.get_position();	//get from ship
			var dir = ship.get_direction(); //get from ship
			var type = 1; 
			var owner_id = ship_id;
			
			this.add_projectile( {x:pos.x,y:pos.y,z:pos.z}, {x:dir.x,y:dir.y,z:dir.z}, type, owner_id );
		}
	}
	
};

try{
	exports.WorldClass = WorldClass;
	global.WorldClass = WorldClass;
}
catch(e){}
