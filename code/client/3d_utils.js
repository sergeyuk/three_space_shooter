
var load_texture = THREE.ImageUtils.loadTexture;

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

	//uniforms[ "tCube" ].texture = GAME.reflectionCube;
	uniforms[ "uReflectivity" ].value = 0.1;

	var parameters = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShader, uniforms: uniforms, lights: true, fog: false };
	var material = new THREE.ShaderMaterial( parameters );
	return material;
}

function create_standard_diffuse_material( diffuse_texture ){
	return new THREE.MeshLambertMaterial( { map: diffuse_texture, transparent: true } );
}


function load_ship_geometry( ship_mesh_id, callback ){
	var mesh_paths = [
		"obj/Gg/Gg.js"
	];
	
	var diffuse_texture_paths = [
		"obj/Gg/Gg.png"		 
	];
	
	var normal_map_paths = [
		"obj/Gg/Gg_NRM.jpg"
	];
	
	var t1 = THREE.ImageUtils.loadTexture("obj/Gg/Gg.png");
	var t2 = THREE.ImageUtils.loadTexture("obj/Gg/Gg_NRM.jpg");
	//load_texture( diffuse_texture_paths[ship_mesh_id] )
	//load_texture( normal_map_paths[ship_mesh_id] ) 
	var material = create_normal_map_material( 
					t1, 
					t2 );

	var loader = new THREE.JSONLoader();	
	loader.load( mesh_paths[ship_mesh_id], function( geometry ){
		geometry.computeTangents();
		callback( geometry, material ); 
	});
}

















