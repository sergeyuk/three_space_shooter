
var ProjectileClass = function() {
	this.dir;
	this.vel;
	this.pos;
	this.owner_id;
	this.max_len;
	this.start;
	this.mesh;
	this.type;
	this.to_be_deleted = false;

	this.tick = function( dt ){
		if( this.to_be_deleted ){
			return 1;
		}
		this.pos.x += ( this.dir.x * this.vel * dt ); 
		this.pos.y += ( this.dir.y * this.vel * dt );
		this.pos.z += ( this.dir.z * this.vel * dt );
		var total_distance = veclen( {x:this.pos.x-this.start.x, y:this.pos.y-this.start.y, z:this.pos.z-this.start.z} );
		//console.log( 'total_distance = ' + total_distance );
		if( total_distance > this.max_len ){
			console.log( "Projectile should be deleted now." );
			return 1;
		}
		
		return 0;
	}
	
	this.update_render = function(){
		if( this.mesh ){
			this.mesh.position.set( this.pos.x, this.pos.y, this.pos.z);
		}	
	}
};

try{
	exports.ProjectileClass = ProjectileClass;
	global.ProjectileClass = ProjectileClass;
}
catch(e){}
