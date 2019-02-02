//CORE VARIABLES
var canvas;
var context;
var imageBuffer;

var DEBUG = false; //whether to show debug messages
var EPSILON = 0.00001; //error margins

//scene to render
var scene;
var camera;
var surfaces = [];
//etc...



var Camera = function(eye, at, up, fovy, aspect){
    this.eye = eye;
    this.at = at;
    this.up = up;
    this.fovy = fovy;
    this.aspect = aspect;
    this.h = 2 * Math.tan( rad( fovy / 2.0 ) );
    this.w = this.h * aspect;
    console.log("camera inserita");
    //console.log(this.eye, this.at, this.up, this.fovy, this.aspect, this.h, this.w);

    this.castRay = function(i, j){
        u = (this. w * i / (canvas.width - 1) ) - this.w / 2.0;
        v = ( - this.h * j / ( canvas.height - 1 ) ) + this.h / 2.0;
        //console.log(u, v);
        s = eye + u*this.at + v*this.up - this.aspect;
        d = s - this.eye;
        return this.eye + d;
    }
}



var Sphere = function(center, radius, material){
    this.center = center;
    this.radius = radius;
    this.material = material;
    console.log("sfera inserita");
    //console.log("sfera", this.center, this.radius, this.material);

    this.intersects = function(p, d){
        temp = Math.sqrt( (d*p)^2 - d^2*(p^2 - 1) );
        return Math.min( (-d*p + temp) / d^2 , (-d*p - temp) / d^2 );
    }
}



//initializes the canvas and drawing buffers
function init() {
    canvas = $('#canvas')[0];
    context = canvas.getContext("2d");
    imageBuffer = context.createImageData(canvas.width, canvas.height); //buffer for pixels
    loadSceneFile("assets/SphereTest.json");
}



//loads and "parses" the scene file at the given path
function loadSceneFile(filepath) {
    scene = Utils.loadJSON(filepath); //load the scene

    camera = new Camera(scene.camera.eye, scene.camera.at, scene.camera.up, scene.camera.fovy, scene.camera.aspect);

    //console.log("eye:", scene.camera.eye, "at:", scene.camera.at, "up:", scene.camera.up, "fovy:", scene.camera.fovy, "aspect:", scene.camera.aspect);

    surfaces.push(new Sphere(scene.surfaces[0].center, scene.surfaces[0].radius, scene.surfaces[0].material));

    //TODO - set up camera

    //TODO - set up surfaces


    render(); //render the scene

}



//renders the scene
function render() {
  console.log("renderizzo");
    var start = Date.now(); //for logging

    ny = canvas.height;
    nx = canvas.width;

    var hitSurface

    for( iy = 0; iy < ny; iy++ ){
        for( ix = 0; ix < nx; ix++){
            ray = camera.castRay(ix, iy);
            hitSurface, t = surfaces[0].intersects(ray);
            if( hitSurface ){
                setPixel(ix, iy, [1,1,1]);
            }else{
                setPixel(ix, iy, [0,0,0]);
            }
        }
    }

     //TODO - fire a ray though each pixel

    //TODO - calculate the intersection of that ray with the scene

    //TODO - set the pixel to be the color of that intersection (using setPixel() method)


    //render the pixels that have been set
    context.putImageData(imageBuffer,0,0);

    var end = Date.now(); //for logging
    $('#log').html("rendered in: "+(end-start)+"ms");
    console.log("rendered in: "+(end-start)+"ms");

}



//sets the pixel at the given x,y to the given color
/**
 * Sets the pixel at the given screen coordinates to the given color
 * @param {int} x     The x-coordinate of the pixel
 * @param {int} y     The y-coordinate of the pixel
 * @param {float[3]} color A length-3 array (or a vec3) representing the color. Color values should floating point values between 0 and 1
 */
function setPixel(x, y, color){
    var i = (y*imageBuffer.width + x)*4;
    imageBuffer.data[i] = (color[0]*255) | 0;
    imageBuffer.data[i+1] = (color[1]*255) | 0;
    imageBuffer.data[i+2] = (color[2]*255) | 0;
    imageBuffer.data[i+3] = 255; //(color[3]*255) | 0; //switch to include transparency
}



//converts degrees to radians
function rad(degrees){
    return degrees*Math.PI/180;
}



//on load, run the application
$(document).ready(function(){
    init();
    render();

    //load and render new scene
    $('#load_scene_button').click(function(){
        var filepath = 'assets/'+$('#scene_file_input').val()+'.json';
        loadSceneFile(filepath);
    });

    //debugging - cast a ray through the clicked pixel with DEBUG messaging on
    $('#canvas').click(function(e){
        var x = e.pageX - $('#canvas').offset().left;
        var y = e.pageY - $('#canvas').offset().top;
        DEBUG = true;
        console.log( camera.castRay(x,y) ); //cast a ray through the point
        DEBUG = false;
    });

});
