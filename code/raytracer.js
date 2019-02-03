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



var T_MASSIMO = 500;

/*
var Ray = function(eye, dir, T_MAX){
    this.eye = eye;
    this.dir = dir;
    this.T_MASSIMO = T_MAX;
}
*/

/*
var Camera = function(eye, at, up, fovy, aspect){
    this.eye = glMatrix.vec3.create();
    this.at = glMatrix.vec3.create();
    this.up = glMatrix.vec3.create();
    glMatrix.vec3.copy(this.eye, eye);
    glMatrix.vec3.copy(this.at, at);
    glMatrix.vec3.copy(this.up, up);
    this.fovy = fovy;
    this.aspect = aspect;

    //this.h = 2 * Math.tan( rad( fovy / 2.0 ) );
    //this.w = this.h * aspect;

    this.g = glMatrix.vec3.create();
    this.w = glMatrix.vec3.create();
    this.u = glMatrix.vec3.create();
    this.v = glMatrix.vec3.create();

    temp = glMatrix.vec3.create();
    temp2 = glMatrix.vec3.create();

    glMatrix.vec3.scale(temp, this.eye, -1);
    //this.g = this.at - this.eye;
    glMatrix.vec3.add(this.g, this.at, temp);
    temp = Math.sqrt( this.g[0]^2 + this.g[1]^2 + this.g[2]^2 );
    this.w[0] = - this.g[0] / temp;
    this.w[1] = - this.g[1] / temp;
    this.w[2] = - this.g[2] / temp;

    temp = Math.sqrt(temp[0]^2 + temp[1]^2 + temp[2]^2);

    glMatrix.vec3.cross(temp2, this.up, this.w);
    this.u[0] = temp2[0] / temp;

    glMatrix.vec3.dot(this.v, this.w, this.u);

    console.log("camera inserita");
    console.log(this.eye, this.at, this.up, this.fovy, "\ng: ", this.g, "\nw: ", this.w, "\nu: ", this.u, "\nv: ", this.v);

    this.castRay = function(u, v){
        var dir = glMatrix.vec3.create();
        var d = 1;
        dir[0] = - d * this.w[0] + u * this.u[0] + v *this.v[0];
        dir[1] = - d * this.w[1] + u * this.u[1] + v *this.v[1];
        dir[2] = - d * this.w[2] + u * this.u[2] + v *this.v[2];

        var r = new Ray(this.eye, dir, T_MASSIMO);
        if( DEBUG ){
            console.log(dir[0]);
            console.log("dir: " +dir);
        }
        return r;
    }
}
*/


var Ray = function(p, dir, tmax){
    this.p = p; //origine
    this.dir = glMatrix.vec3.normalize([],dir); //direzione
    this.tmax = tmax; //max valore per cui il raggio è valido (TEST)

    this.pointAt = function(t){
        //return A + t * d
        var tmp = glMatrix.vec3.create();
        tmp = glMatrix.vec3.add( [], this.p, glMatrix.vec3.scale( [], this.dir, t ) ); //a + t*dir

        //if (test < 10) console.log("p(+"+t+"): ["+tmp+"] direzione: "+this.dir);
        return tmp;
    }
}


var Camera = function(eye, up, at, fovy){
    this.eye = glMatrix.vec3.fromValues( eye[0], eye[1], eye[2] ); // Posizione della camera    (e)
    this.up = glMatrix.vec3.fromValues( up[0], up[1], up[2]);     // Inclinazione testa        (t)
    this.at = glMatrix.vec3.fromValues( at[0], at[1], at[2]);     // Punto verso cui guardo    (?)
    var dir = glMatrix.vec3.subtract( [], this.at, this.eye );   // Direzione dello sguardo   (g)

    //Camera frame (Lezione 8, slide 19)
    this.w = glMatrix.vec3.scale( [], glMatrix.vec3.normalize( [], dir ), -1 );           //- normalize(dir);
    this.u = glMatrix.vec3.normalize( [], glMatrix.vec3.cross( [], this.up, this.w ) );   //normalize(up * w)
    this.v = glMatrix.vec3.cross( [], this.w, this.u );                           //w * u;

    // console.log(this.w, this.u, this.v);
    this.fovy = fovy;

    this.castRay = function(u, v){ //calcola il raggio che parte dalla camera e interseca il punto (u,v) nel rettangolo di vista
        //Calcolo la direzione del raggio.
        var dir = glMatrix.vec3.create();
        var d = 1; //per ipotesi dalle specifiche
        dir[0] = - d * this.w[0] + u * this.u[0] + v * this.v[0];
        dir[1] = - d * this.w[1] + u * this.u[1] + v * this.v[1];
        dir[2] = - d * this.w[2] + u * this.u[2] + v * this.v[2];

        var r = new Ray(this.eye, dir, T_MASSIMO);
        if (DEBUG) console.log("dir:"+dir);
        return r;
    }
}


var Sphere = function(center, radius, material){
    this.center = center;
    this.radius = radius;
    this.material = material;
    console.log("sfera inserita");
    console.log("sfera", this.center, this.radius, this.material);

    this.intersects = function(ray){
        var oc = glMatrix.vec3.create();
        oc = glMatrix.vec3.add( [], ray.p, glMatrix.vec3.scale( [], this.center, -1 ) );

        var a = glMatrix.vec3.dot( ray.dir, ray.dir );
        var b = 2.0 * glMatrix.vec3.dot( oc, ray.dir );
        var c = glMatrix.vec3.dot( oc, oc) - radius * radius;
        var discriminant = b*b - 4*a*c;
        //return (discriminant > 0);
        if(discriminant < 0){
            return -1.0;
        }else{
            return (-b - Math.sqrt(discriminant) ) / (2.0 * a);
        }
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

    console.log("eye:", scene.camera.eye, "at:", scene.camera.at, "up:", scene.camera.up, "fovy:", scene.camera.fovy, "aspect:", scene.camera.aspect);

    surfaces.push(new Sphere(scene.surfaces[0].center, scene.surfaces[0].radius, scene.surfaces[0].material));

    //TODO - set up camera

    //TODO - set up surfaces


    render(); //render the scene

}



//renders the scene
function render() {
    console.log("renderizzo");
    var start = Date.now(); //for logging

    var ny = canvas.height;
    var nx = canvas.width;

    var h = 2 * Math.tan( rad( scene.camera.fovy / 2.0 ) );
    var w = h * scene.camera.aspect;


    for( iy = 0; iy < ny; iy++ ){
        for( ix = 0; ix < nx; ix++){
            var u = ((w * ix) / (canvas.width - 1) ) - w / 2.0;
            var v = ((-h * iy) / (canvas.height - 1) ) + h / 2.0;
            ray = camera.castRay( u, v );
            //ray = camera.castRay(ix, iy);
            t = surfaces[0].intersects(ray);
            if( t > 0 ){
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
        console.log( surfaces[0].intersects( camera.castRay(x,y) ) );
        DEBUG = false;
    });

});
