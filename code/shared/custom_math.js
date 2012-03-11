function normalize( vec ) {
	var denominator = veclen( vec );

	var return_vec = { x:0, y:0, z:0 };
	if( denominator > 0 ){
		return_vec.x = (vec.x / denominator ); 
		return_vec.y = (vec.y / denominator ); 
		return_vec.z = (vec.z / denominator );
	}
	return return_vec;	
};

function veclen( vec ){
	return Math.sqrt( vec.x*vec.x + vec.y*vec.y + vec.z*vec.z );
}

function compute_sq_distance( v1, v2 ){
	//console.log( 'compute_sq_distance: v1: ' + v1 + ', v2: ' + v2 );
	var dx = v1.x - v2.x;
	var dy = v1.y - v2.y;
	var dz = v1.z - v2.z;
	return dx*dx + dy*dy + dz*dz;
}


try{
	global.normalize = normalize;
	global.veclen = veclen;
	global.compute_sq_distance = compute_sq_distance;
}
catch(e){}
