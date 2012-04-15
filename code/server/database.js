
var Database = function() {
	this.registered_users = {};
	
	this.get_registered_user = function( user_name ){
		if( this.registered_users.hasOwnProperty( user_name ) ){
			return this.registered_users[user_name];
		}
		else{
			return undefined;
		}
	}
	
	this.is_user_registered = function( user_name ){
		return ( this.get_registered_user( user_name ) !== undefined );
	}

	this.register_new_user = function( user_name, user_object ){
		this.registered_users[user_name] = user_object;
	}
};


try{
	exports.Database = Database;
	global.Database = Database;
}
catch(e){}
