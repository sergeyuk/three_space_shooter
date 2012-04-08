function on_login_button_click(){
	var user_name_box = $('#login_name')[0];
	var user_name = user_name_box.value;
	if( user_name.length > 0 ){
		CLIENT_STATE.front_end_socket.emit( 'login request', [user_name] )
	}
	else{
		alert( "Please enter username" );
	}
}

function enter_login_page(){
	console.log( "Entered login page" );
	
	// Setup callbacks
	var login_button = $('#login_button')[0];
	login_button.onmouseup = on_login_button_click;
}

function leave_login_page(){
	
}
