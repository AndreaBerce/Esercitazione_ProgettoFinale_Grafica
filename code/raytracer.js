"use strict";
//prova

var filename = "assets/SphereTest.json";

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
var materials;
var aspect;
//etc...

//CLASSES PROTOTYPES
var Camera = function(eye, up, at){
    this.eye = glMatrix.vec3.fromValues(eye[0], eye[1], eye[2]);   // Posizione della camera  (e)
    this.up = glMatrix.vec3.fromValues(up[0], up[1], up[2]);     // Inclinazione testa        (t)
    this.at = glMatrix.vec3.fromValues(at[0], at[1], at[2]);     // Direzione dello sguardo   (g)

    //Ricavo il camera frame {u,v,w} dai vettori eye,at,up (lezione 8, slide 19)
    this.w = glMatrix.vec3.scale([], glMatrix.vec3.normalize([], this.at), -1);
    this.u = glMatrix.vec3.normalize([], glMatrix.vec3.cross([], this.up, this.w)); //normalize(up * w)
    this.v = glMatrix.vec3.cross([], this.w, this.u); //w * u;


    this.castRay = function(x,y){ //calcola il raggio che parte dalla camera e interseca il punto (x,y) nel rettangolo di vista
        //Calcolo la direzione del raggio.
        var dir = glMatrix.vec3.create();
        var d = 1; //per ipotesi dalle specifiche
        dir[0] = - d * this.w[0] + x * this.u[0] + y * this.v[0];
        dir[1] = - d * this.w[1] + x * this.u[1] + y * this.v[1];
        dir[2] = - d * this.w[2] + x * this.u[2] + y * this.v[2];

        var r = new Ray(this.eye, dir);
        return r;
    }
}

//Surfaces
var Sphere = function(center, radius, material){
    this.center = center;
    this.radius = radius;
    this.material = material;

    this.intersects = function(ray){//Implementa formula sulle slide del prof
        var p = glMatrix.vec3.subtract([], ray.a, this.center); //e - c
        var d = ray.dir;
        //console.log("p: "+p+"; d: "+d);

        var ddotp = glMatrix.vec3.dot(d,p);
        //console.log(ddotp);
        var psquare = glMatrix.vec3.dot(p, p);
        //console.log(psquare);
        var dsquare = glMatrix.vec3.dot(d, d);
        //console.log(dsquare);

        var delta = ddotp*ddotp - dsquare*(psquare - this.radius*this.radius);
        if(delta >= 0){
            var t1 = (-ddotp + Math.sqrt(delta)) / dsquare;
            var t2 = (-ddotp - Math.sqrt(delta)) / dsquare;

            if(t1 > 0){
                return t1;
            }else{
                return t2;
            }
        }else{
            return false;
        }
    }

    this.hitSurface = function(ray){ //wrapper per debug
        return intersects(ray);
    }
}

var Triangle = function(p1, p2, p3, material){
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.material = material;
}

//Ray-Intersect
var Ray = function(a, dir){
    this.a = a; //origine
    this.dir = dir; //direzione

    this.pointAtParameter = function( t ){//return A + t * d
        var tmp;
        //tmp = glMatrix.vec3.add([],a,glMatrix.vec3.scale([],d,t)); //non si capisce niente così
        tmp[0] = this.a + t * dir[0];
        tmp[1] = this.a + t * dir[1];
        tmp[2] = this.a + t * dir[2];
        return tmp;
    }
}

var Intersection = function(x, y, z){
    this.int = new glMatrix.vec3(x, y, z);
}

//Lighting
var Light = function(){
}

var Material = function(){
}


//initializes the canvas and drawing buffers
function init(){
    canvas = $('#canvas')[0];
    context = canvas.getContext("2d");
    imageBuffer = context.createImageData(canvas.width, canvas.height); //buffer for pixels

    loadSceneFile(filename);


}


//loads and "parses" the scene file at the given path
function loadSceneFile(filepath){
    scene = Utils.loadJSON(filepath); //load the scene

    // console.log(scene.camera); loading is ok

    //TODO - set up camera
    //set up camera
    aspect = scene.camera.aspect;
    camera = new Camera(scene.camera.eye, scene.camera.up, scene.camera.at);

    //TODO - set up surfaces
    for(var i = 0; i < scene.surfaces.length; i++) {
        if (scene.surfaces[i].shape == "Sphere") {
            surfaces.push(new Sphere(scene.surfaces[i].center, scene.surfaces[i].radius, scene.surfaces[i].materials));
        }
        if (scene.surfaces[i].shape == "Triangle") {
            surfaces.push(new Triangle(scene.surfaces[i].p1, scene.surfaces[i].p2, scene.surfaces[i].p3, scene.surfaces[i].material));
        }

    }

}


//renders the scene
function render(){
    var h,w,u,v,s;
    var backgroundcolor = [0,0,0];
    var start = Date.now(); //for logging
    h = 2*Math.tan(rad(scene.camera.fovy/2.0));
    w = h * aspect;

    for (var i = 0; i <= canvas.width;  i++) { //indice bordo sinistro se i=0 (bordo destro se i = nx-1)
        for (var j = 0; j <= canvas.height; j++) {
            u = (w*i/(canvas.width-1)) - w/2.0;
            v = (-h*j/(canvas.height-1)) + h/2.0;

            //TODO - fire a ray though each pixel
            var ray = camera.castRay(u, v);
            //if (i < 1 && j< 10) console.log(ray);

            var t = false;
            for (var k = 0; k < surfaces.length; k++) {
                //calculate the intersection of that ray with the scene
                t = surfaces[k].intersects(ray);

                //set the pixel to be the color of that intersection (using setPixel() method)
                if(t == false){
                    setPixel(i, j, backgroundcolor);
                }
                else{
                    setPixel(i, j, [255,0,0]);
                }
            }

        }
    }

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
function rad( degrees ){
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
        h = 2*Math.tan(rad(scene.camera.fovy/2.0));
        w = h * aspect;
        u = (w*x/(canvas.width-1)) - w/2.0;
        v = (-h*y/(canvas.height-1)) + h/2.0;
        camera.castRay(u,v); //cast a ray through the point
        DEBUG = false;
    });

});
