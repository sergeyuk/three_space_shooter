
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

////////////// Predefined structures /////////
var LOGIN_PAGE_ID = 0;
var CREATE_NEW_USER_PAGE_ID = 1;
var MAIN_PAGE_ID = 2;
var GAME_PAGE_ID = 3;

var page_enter_callbacks = [
	enter_login_page,
	enter_create_new_user_page,
	enter_main_page,
	enter_game_page
];

var page_leave_callbacks = [
	leave_login_page,
	leave_create_new_user_page,
	leave_main_page,
	leave_game_page
];

var CLIENT_STATE = new function(){
	this.page_id;
	this.front_end_socket;
	this.game_socket;
	this.user_object;
};

///////////////// execution code //////////////
client_init();

///////////////// client functions ////////////
function client_init(){
	var front_end_socket = io.connect();
	CLIENT_STATE.front_end_socket = front_end_socket;
	
	//CLIENT_STATE.game_socket = io.connect('192.168.0.5', {port:9000});;
	
	front_end_socket.on('connected', function () {
		console.log('Connected to the Front End server.');
		change_page( LOGIN_PAGE_ID );
	});
	 
	front_end_socket.on( 'create new user', function( data ){
		change_page( CREATE_NEW_USER_PAGE_ID, data );
	});
	
	front_end_socket.on( 'login accepted', function( data ){
		change_page( MAIN_PAGE_ID, data );
	});
	
	front_end_socket.on( 'game session started', function( data ){
		change_page( GAME_PAGE_ID, data );
	});
	
	front_end_socket.on('error', function( error_string ){
		alert( error_string );
	});
}

// Utility functions
function change_page( page_id, userdata ){
	console.log( "Changed page from " + CLIENT_STATE.page_id + " to " + page_id );
	
	if( CLIENT_STATE.page_id != undefined ){
		page_leave_callbacks[CLIENT_STATE.page_id]( userdata );
		$( '#page' + CLIENT_STATE.page_id )[0].style.display = 'none';
	}
	
	CLIENT_STATE.page_id = page_id;
	
	$('#page' + page_id)[0].style.display = 'block';
	
	page_enter_callbacks[page_id]( userdata );
}

