
var FlagClass = function() {
	this.pos;
	this.team_id;
	this.mesh;

	this.tick = function( dt ){
		return 0;
	}
	
	this.update_render = function(){
	}
};

var FlagPlatformClass = function(){
	this.pos;
	this.team_id;
	this.mesh;
};

try{
	exports.FlagClass = FlagClass;
	exports.FlagPlatformClass = FlagPlatformClass;
	
	global.FlagClass = FlagClass;
	global.FlagPlatformClass = FlagPlatformClass;
}
catch(e){}
