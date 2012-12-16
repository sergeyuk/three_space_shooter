
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

var SOUNDS_TO_LOAD = [
    ['Explosion', "sound/Explosion.ogg"],
    ['Fire', "sound/Fire.ogg"],
    ['Flight', "sound/Flight.ogg"],
    ['GUI_Buttons', "sound/GUI_Buttons.ogg"],
    ['GUI_Start', "sound/GUI_Start.ogg"],
    ['Hit', "sound/Hit.ogg"],
    ['Respawn', "sound/Respawn.ogg"],
    ['Start', "sound/Start.ogg"],
    ['Stop', "sound/Stop.ogg"]    
];

var SOUND_MANAGER = new function(){
    this.context;
    this.compressor;
    
    this.sound_buffers = {};
    
    this.update_listener = function( pos, dir, up ){
        //void setPosition(float x, float y, float z);
        //void setOrientation(float x, float y, float z, float xUp, float yUp, float zUp);
        if( this.context ){
            this.context.listener.setPosition(pos.x, pos.y, pos.z);
            this.context.listener.setOrientation(dir.x, dir.y, dir.z, up.x, up.y, up.z);   
        }
    }
    
    this.play_sound = function( sound_name, loop, x, y, z ){
        if( this.context ){
            if( this.get_percentage_of_sounds_loaded() == 100 ){
                if( this.sound_buffers.hasOwnProperty( sound_name ) ){
                    loop = typeof loop !== 'undefined' ? loop : false;
                    x = typeof x !== 'undefined' ? x : 0;
                    y = typeof y !== 'undefined' ? y : 0;
                    z = typeof z !== 'undefined' ? z : 0;
              
                    var oneShotSound = this.context.createBufferSource();
                    oneShotSound.buffer = this.sound_buffers[sound_name];
                
                    // Create a filter, panner, and gain node. 
                    //var lowpass = this.context.createBiquadFilter();
                    var panner = this.context.createPanner();
                    var gainNode2 = this.context.createGainNode();
                
                    // Make connections 
                    oneShotSound.connect(panner);
                    //lowpass.connect(panner);
                    panner.connect(gainNode2);
                    gainNode2.connect(this.compressor);
                
                    panner.setPosition( x, y, z );
                    
                    oneShotSound.noteOn(this.context.currentTime);
                }
                else{
                    alert( 'Error in play_sound. The sound ' + sound_name + ' was not loaded.' );
                }
            }
            else{
                alert( 'Error in play_sound. Not all sounds are loaded.' );
        }
        }
    }
    
    this.get_percentage_of_sounds_loaded = function(){
        var total_to_load = SOUNDS_TO_LOAD.length;
        
        var sounds_loaded = 0;
        for( var key in this.sound_buffers ){
            if( this.sound_buffers.hasOwnProperty( key ) ){
                sounds_loaded++;
            }
        }
        
        return Math.round( (100*sounds_loaded)/total_to_load ); 
    }
    
    this.load_sound = function( name, path ){
        var that = this;
        var request = new XMLHttpRequest();
        request.open("GET", path, true);
        request.responseType = "arraybuffer";
        request.onload = function(e) {
            // Create a buffer from the response ArrayBuffer.
            var buffer = that.context.createBuffer(this.response, false);
            if( that.sound_buffers.hasOwnProperty( name ) ){
                alert( 'Error! Sound buffers duplication for ' + name );
            }
            else{
                that.sound_buffers[name] = buffer;
            }
            if( that.get_percentage_of_sounds_loaded() == 100 ){
                alert( 'All sounds loaded!' );
            }
        };
        request.send();
    };
    
    this.init_sound = function(){
        window.AudioContext = (
          window.AudioContext ||
          window.webkitAudioContext ||
          null
        );
        
        if (!AudioContext) {
          throw new Error("AudioContext not supported!");
        } 
        
        // Create a new audio context.
        var context = new AudioContext();
        var compressor = context.createDynamicsCompressor()
        
        compressor.connect(context.destination);
        
        this.context = context;
        this.compressor = compressor;
        
        for( var i = 0; i < SOUNDS_TO_LOAD.length; i++ ){
            var pair = SOUNDS_TO_LOAD[i];
            var sound_name = pair[0];
            var sound_path = pair[1];
            this.load_sound( sound_name, sound_path );
        }
        
        /*
        // Connect the main volume node to the context destination.
        mainVolume.connect(ctx.destination);

        var sound = {};
        sound.source = ctx.createBufferSource();
        sound.volume = ctx.createGainNode();

        // Connect the sound source to the volume control.
        sound.source.connect(sound.volume);
        // Hook up the sound volume control to the main volume.
        sound.volume.connect(mainVolume);

        // Make the sound source loop.
        sound.source.loop = true;
        
        // Load a sound file using an ArrayBuffer XMLHttpRequest.
        var request = new XMLHttpRequest();
        request.open("GET", "sound/Fire.ogg", true);
        request.responseType = "arraybuffer";
        request.onload = function(e) {
          // Create a buffer from the response ArrayBuffer.
          var buffer = ctx.createBuffer(this.response, false);
          sound.buffer = buffer;
        
          // Make the sound source use the buffer and start playing it.
          sound.source.buffer = sound.buffer;
          sound.source.noteOn(ctx.currentTime);
        };

        this.ctx = ctx;
        this.mainVolume = mainVolume;
        this.sound = sound;
                
        request.send();*/
    }
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
	
	SOUND_MANAGER.init_sound();
	console.log( 'Finished initialising sounds. Now waiting for all stuff to load.' );
}
    
/*
function init_sound(){
	var base_sound_folder = "sound/";
	createjs.FlashPlugin.BASE_PATH = "./js/soundjs/"; // Initialize the base path from this document to the Flash Plugin
    if( false ) {
        createjs.SoundJS.registerPlugins([createjs.FlashPlugin]);
    } else {
        createjs.SoundJS.registerPlugins([createjs.HTMLAudioPlugin, createjs.FlashPlugin]);
    }
    
	if (!createjs.SoundJS.checkPlugin(true)) {
		alert( 'Soundjs initialise error. No supported plugins found.' );
		return;
	}
	
	var assetsPath = base_sound_folder;
    var manifest = [
        {id:"Explosion",    src:assetsPath+"Explosion.ogg", data:1},
        {id:"Fire",         src:assetsPath+"Fire.ogg", data:1},
        {id:"Flight",       src:assetsPath+"Flight.ogg", data:1},
        {id:"GUI_Buttons",  src:assetsPath+"GUI_Buttons.ogg"},
        {id:"GUI_Start",    src:assetsPath+"GUI_Start.ogg"},
        {id:"Hit",          src:assetsPath+"Hit.ogg", data:1},
        {id:"Respawn",      src:assetsPath+"Respawn.ogg", data:1},
        {id:"Start",        src:assetsPath+"Start.ogg", data:1},
        {id:"Stop",         src:assetsPath+"Stop.ogg", data:1}
    ];
    
	//createjs.FlashPlugin.BASE_PATH = "./js/soundjs/"; // Initialize the base path from this document to the Flash Plugin

	// Instantiate a queue.
	queue = new createjs.PreloadJS();
	queue.installPlugin(createjs.SoundJS); // Plug in createjs.SoundJS to handle browser-specific paths
	queue.onComplete = function(){ 
	    //alert( 'loaded sound' );
	    setInterval( function(){
                createjs.SoundJS.play('Fire', 'any');
            }, 300 );
	};
	queue.onFileError = function(){ alert( 'error in loading sound file' ); };
    queue.loadManifest(manifest);
}*/

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

