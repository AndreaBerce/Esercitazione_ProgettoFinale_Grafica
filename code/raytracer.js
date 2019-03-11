//CORE VARIABLES
var canvas;
var context;
var imageBuffer;

var DEBUG = false; //whether to show debug messages
var EPSILON = 0.00001; //error margins

//scene to render
var scene;
var camera;
var surfaces;
var materials;
var ambientLight;
var pointLight;
var directionalLight;
var aspect;
//etc...

var filename = "assets/SphereTest.json";

var Camera = function(eye, up, at){
    this.eye = glMatrix.vec3.fromValues(eye[0], eye[1], eye[2]);
    this.up = glMatrix.vec3.fromValues(up[0], up[1], up[2]);
    this.at = glMatrix.vec3.fromValues(at[0], at[1], at[2]);

    this.w = glMatrix.vec3.scale([], glMatrix.vec3.normalize([], this.at), -1);
    this.u = glMatrix.vec3.normalize([], glMatrix.vec3.cross([], this.up, this.w));
    this.v = glMatrix.vec3.cross([], this.w, this.u);

    console.log("eye camera: ", this.eye);
    console.log("up camera: ", this.up);
    console.log("at camera: ", this.at);
    console.log("w camera: ", this.w);
    console.log("u camera: ", this.u);
    console.log("v camera: ", this.v);


    this.castRay = function(x, y){ //calcola il raggio che parte dalla camera e interseca il punto (x,y) nel rettangolo di vista
        var dir = glMatrix.vec3.create();
        var d = 1; //per ipotesi dalle specifiche
        //Calcolo la direzione del raggio.
        dir[0] = - d * this.w[0] + x * this.u[0] + y * this.v[0];
        dir[1] = - d * this.w[1] + x * this.u[1] + y * this.v[1];
        dir[2] = - d * this.w[2] + x * this.u[2] + y * this.v[2];

        var r = new Ray(this.eye, dir);
        return r;
    }
}


var Sphere = function(centro, raggio, materiale){
    this.centro = centro;
    this.raggio = raggio;
    this.raggio2 = raggio*raggio;
    this.materiale = materiale;
    this.trasformate = glMatrix.mat4.create();
    this.trasformateI = glMatrix.mat4.invert([], this.trasformate);
    this.trasformateIT = glMatrix.mat4.transpose([], this.trasformateI);;
    console.log("sfera inserita");
    console.log("sfera", this.centro);

    this.intersect = function(ray){
        var p = glMatrix.vec3.subtract([], ray.p, this.centro);
        var dp = glMatrix.vec3.dot(ray.dir,p);
        var pp = glMatrix.vec3.dot(p, p);
        var dd = glMatrix.vec3.dot(ray.dir, ray.dir);

        var delta = dp*dp - dd*(pp - this.raggio2);
        if(delta >= 0){
            var t1 = (-dp + Math.sqrt(delta)) / dd;
            var t2 = (-dp - Math.sqrt(delta)) / dd;

            if(t1 > 0 && t1 < t2){
                return t1;
            }
            if(t2 > 0 && t2 < t1){
                return t2;
            }else{
                return false;//sfera dietro la camera
            }
        }else{
            return false;
        }
    }

    this.hitSurface = function(ray){
        var temp = glMatrix.mat4.multiply([], this.trasformateI, [ray.p[0], ray.p[1], ray.p[2], 1]);
        var temp2 = glMatrix.mat4.multiply([], this.trasformateI, [ray.dir[0], ray.dir[1], ray.dir[2], 0]);
        return new Ray( [temp[0], temp[1], temp[2]], [temp2[0], temp2[1], temp2[2]] );
    }

    this.traslazione = function(vettore){
        console.log("traslazione sfera");
        glMatrix.mat4.translate(this.trasformate, this.trasformate, vettore);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        glMatrix.mat4.transpose(this.trasformateIT, this.trasformateI);
    }

    this.rotazione = function(vettore){
        console.log("rotazione sfera");
        if( vettore[0] != 0 ){
            glMatrix.mat4.rotateX(this.trasformate, this.trasformate, rad(vettore[0]) );
        }
        if( vettore[1] != 0 ){
            glMatrix.mat4.rotateY(this.trasformate, this.trasformate, rad(vettore[1]) );
        }
        if( vettore[2] != 0 ){
            glMatrix.mat4.rotateZ(this.trasformate, this.trasformate, rad(vettore[2]) );
        }
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        glMatrix.mat4.transpose(this.trasformateIT, this.trasformateI);
        console.log("rotazione: ", this.trasformate, this.trasformateI);
    }

    this.scala = function(vettore){
        console.log("scala sfera");
        glMatrix.mat4.scale(this.trasformate, this.trasformate, vettore);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        glMatrix.mat4.transpose(this.trasformateIT, this.trasformateI);
        console.log("scalatura: ", this.trasformate, this.trasformateI);
    }

    this.trasformation_point = function(point){
        var temp = glMatrix.mat4.multiply([], this.trasformate, [point[0], point[1], point[2], 1]);
        return glMatrix.vec3.fromValues(temp[0], temp[1], temp[2]);
    }

    this.getNormal = function(point){
        var temp = glMatrix.vec3.subtract([], point, this.centro );
        glMatrix.mat4.multiply( temp, this.trasformateIT, [temp[0], temp[1], temp[2], 0] );
        return glMatrix.vec3.normalize([], glMatrix.vec3.fromValues(temp[0], temp[1], temp[2]) );
    }
}


var Triangle = function(p1, p2, p3, materiale){
    this.a = p1;
    this.b = p2;
    this.c = p3;
    this.materiale = materiale;
    this.trasformate = glMatrix.mat4.create();
    this.trasformateI = glMatrix.mat4.invert([], this.trasformate);
    this.trasformateIT = glMatrix.mat4.transpose([], this.trasformateI);;

    this.intersect = function(ray){
        var ab = glMatrix.vec3.subtract([], this.a, this.b);
        var ac = glMatrix.vec3.subtract([], this.a, this.c);
        var d =  ray.dir;
        var ae = glMatrix.vec3.subtract([], this.a, ray.p);

        var M = ab[0]*(ac[1]*d[2] - d[1]*ac[2]) +
                ab[1]*(d[0]*ac[2] - ac[0]*d[2]) +
                ab[2]*(ac[0]*d[1] - ac[1]*d[0]);

        var t = -(ac[2]*(ab[0]*ae[1] - ae[0]*ab[1]) +
                  ac[1]*(ae[0]*ab[2] - ab[0]*ae[2]) +
                  ac[0]*(ab[1]*ae[2] - ae[1]*ab[2]) ) / M;
        if( t < 0 ){
            return false;
        }
        var gamma = (d[2]*(ab[0]*ae[1] - ae[0]*ab[1]) +
                     d[1]*(ae[0]*ab[2] - ab[0]*ae[2]) +
                     d[0]*(ab[1]*ae[2] - ae[1]*ab[2]) ) / M;
        if( gamma < 0 ){
            return false;
        }
        var beta = (ae[0]*(ac[1]*d[2] - d[1]*ac[2]) +
                    ae[1]*(d[0]*ac[2] - ac[0]*d[2]) +
                    ae[2]*(ac[0]*d[1] - ac[1]*d[0])) / M;
        if( beta < 0 || beta > (1 - gamma) ){
            return false;
        }
        return t;
    }

    this.hitSurface = function(ray){
        var temp = glMatrix.mat4.multiply([], this.trasformateI, [ray.p[0], ray.p[1], ray.p[2], 1]);
        var temp2 = glMatrix.mat4.multiply([], this.trasformateI, [ray.dir[0], ray.dir[1], ray.dir[2], 0]);
        return new Ray( [temp[0], temp[1], temp[2]], [temp2[0], temp2[1], temp2[2]] );
    }

    this.traslazione = function(vettore){
        console.log("traslazione sfera");
        glMatrix.mat4.translate(this.trasformate, this.trasformate, vettore);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        glMatrix.mat4.transpose(this.trasformateIT, this.trasformateI);
    }

    this.rotazione = function(vettore){
        console.log("rotazione sfera");
        if( vettore[0] != 0 ){
            glMatrix.mat4.rotateX(this.trasformate, this.trasformate, rad(vettore[0]) );
        }
        if( vettore[1] != 0 ){
            glMatrix.mat4.rotateY(this.trasformate, this.trasformate, rad(vettore[1]) );
        }
        if( vettore[2] != 0 ){
            glMatrix.mat4.rotateZ(this.trasformate, this.trasformate, rad(vettore[2]) );
        }
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        glMatrix.mat4.transpose(this.trasformateIT, this.trasformateI);
        console.log("rotazione: ", this.trasformate, this.trasformateI);
    }

    this.scala = function(vettore){
        console.log("scala sfera");
        glMatrix.mat4.scale(this.trasformate, this.trasformate, vettore);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        glMatrix.mat4.transpose(this.trasformateIT, this.trasformateI);
        console.log("scalatura: ", this.trasformate, this.trasformateI);
    }

    this.trasformation_point = function(point){
        var temp = glMatrix.mat4.multiply([], this.trasformate, [point[0], point[1], point[2], 1]);
        return glMatrix.vec3.fromValues(temp[0], temp[1], temp[2]);
    }

    this.getNormal = function(point){
        var temp1 = glMatrix.vec3.subtract([], this.c, this.a);
        var temp2 = glMatrix.vec3.subtract([], this.b, this.a);
        temp1 = glMatrix.vec3.cross([], temp1, temp2);
        return glMatrix.vec3.normalize([], temp1);
    }
}



//shader luce puntiforme
function shadeA(materiale, k){
    return glMatrix.vec3.fromValues(materials[materiale].ka[0] * ambientLight[k].colore[0],
                                    materials[materiale].ka[1] * ambientLight[k].colore[1],
                                    materials[materiale].ka[2] * ambientLight[k].colore[2]);
}


//shader luce puntiforme
function shadeP(ray, point, normale, light, materiale){
    return shadeG(ray, point, normale, light, glMatrix.vec3.normalize( [], glMatrix.vec3.subtract([], light.punto, point ) ), materiale);
}

//shader luce direzionale
function shadeD(ray, point, normale, light, materiale){
    return shadeG(ray, point, normale, light, glMatrix.vec3.normalize([], [-light.direzione[0], -light.direzione[1], -light.direzione[2]]), materiale);
}

//shader generico
function shadeG(ray, point, normale, light, l, materiale){
    // ombra, verifico che non esistano superfici tra il punto e la luce
    var r = new Ray(point, l);
    var temp_ray, temp, t_min = false;
    for( var k = 0; k < surfaces.length; k++ ){
        //calculate the intersection of that ray with the scene
        temp_ray = surfaces[k].hitSurface(r);
        temp = surfaces[k].intersect(temp_ray);
        if( temp != false ){
            t_min = temp;
        }
    }
    if(t_min != false){ // ombra
        return [0,0,0];
    }else{  // nessuna ombra
        //Lambert
        var temp = glMatrix.vec3.dot(l, normale);
        var colore = [0,0,0];
        if( Math.max(0, temp) ){
            colore = [materials[materiale].kd[0] * light.colore[0] * temp,
                      materials[materiale].kd[1] * light.colore[1] * temp,
                      materials[materiale].kd[2] * light.colore[2] * temp];
        }
        //Phong
        var v = glMatrix.vec3.normalize([], glMatrix.vec3.scale([], ray.dir, -1));
        temp = 2 * glMatrix.vec3.dot(l, normale);
        var r = [temp * normale[0] - l[0],
                 temp * normale[1] - l[1],
                 temp * normale[2] - l[2]];
        temp = glMatrix.vec3.dot(r, v);
        if( Math.max(temp, 0) ){
            temp = Math.pow(temp, materials[materiale].shininess);
            colore = [materials[materiale].ks[0] * light.colore[0] * temp + colore[0],
                      materials[materiale].ks[1] * light.colore[1] * temp + colore[1],
                      materials[materiale].ks[2] * light.colore[2] * temp + colore[2]];
        }
        return colore;
    }
}


function trace(ray, nRiflessioni){
    var t_min = false;
    var temp_ray;
    var temp = false;
    var k_min;
    var ray_min;
    for( var k = 0; k < surfaces.length; k++ ){//calcolo intersezione raggio sfera
        temp_ray = surfaces[k].hitSurface(ray);
        temp = surfaces[k].intersect(temp_ray);
        if( temp != false && ( temp < t_min || t_min == false) ){
            t_min = temp;
            k_min = k;
            ray_min = temp_ray;
        }
    }

    //setta il colore del pixel dell'intersezione
    if(t_min == false){
        return [0,0,0];
    }
    else{
        var point = ray_min.pointAtParameter( t_min );
        var point_transform = surfaces[k_min].trasformation_point(point);
        var normale = surfaces[k_min].getNormal(point);
        var l = glMatrix.vec3.create();
        for( var k = 0; k < ambientLight.length; k++ ){
            glMatrix.vec3.add( l, l, shadeA( surfaces[k_min].materiale, k ) );
        }
        for( var k = 0; k < directionalLight.length; k++ ){
            glMatrix.vec3.add( l, l, shadeD( ray_min, point_transform, normale, directionalLight[k], surfaces[k_min].materiale ) );
        }
        for( var k = 0; k < pointLight.length; k++ ){
            glMatrix.vec3.add( l, l, shadeP( ray_min, point_transform, normale, pointLight[k], surfaces[k_min].materiale ) );
        }
        if( nRiflessioni > 0 && ( materials[surfaces[k_min].materiale].kr[0] != 0
                                 | materials[surfaces[k_min].materiale].kr[1] != 0
                                 | materials[surfaces[k_min].materiale].kr[2] != 0 ) ){
            var v = glMatrix.vec3.normalize([], glMatrix.vec3.scale([], ray_min.dir, -1));
            var temp = 2 * glMatrix.vec3.dot(normale, v);
            var r = new Ray(point_transform,  [temp * normale[0] - v[0],
                                               temp * normale[1] - v[1],
                                               temp * normale[2] - v[2]] );
            v = trace(r , nRiflessioni-1);
            v = [v[0] * materials[surfaces[k_min].materiale].kr[0],
                 v[1] * materials[surfaces[k_min].materiale].kr[1],
                 v[2] * materials[surfaces[k_min].materiale].kr[2]];
            glMatrix.vec3.add(l, l, v );
        }
        return l;
    }
}



var Ray = function(p, dir){
    this.p = p;       //origine
    this.dir = dir;   //direzione

    this.pointAtParameter = function( t ){//return A + t * d
        return glMatrix.vec3.add([], this.p, glMatrix.vec3.scale([], this.dir, t));
    }
}

//Lighting
var AmbientLight = function(colore){
    this.colore = colore;
}

var PointLight = function(colore, punto){
    this.colore = colore;
    this.punto = punto;
}

var DirectionalLight = function(colore, direzione){
    this.colore = colore;
    this.direzione = direzione;
}

var Material = function(ka, kd, ks, shininess, kr){
    this.ka = ka;
    this.kd = kd;
    this.ks = ks;
    this.shininess = shininess;
    this.kr = kr;
}


//initializes the canvas and drawing buffers
function init(){
    canvas = $('#canvas')[0];
    context = canvas.getContext("2d");
    imageBuffer = context.createImageData(canvas.width, canvas.height); //buffer dei pixel

    surfaces = new Array();
    materials = new Array();
    ambientLight = new Array();
    pointLight = new Array();
    directionalLight = new Array();

    loadSceneFile(filename);
}


//loads and "parses" the scene file at the given path
function loadSceneFile(filepath){
    scene = Utils.loadJSON(filepath); //load the scene

    console.log(scene.camera); //loading is ok

    //TODO - set up camera
    //set up camera
    aspect = scene.camera.aspect;
    camera = new Camera(scene.camera.eye, scene.camera.up, scene.camera.at);

    //TODO - set up surfaces
    for(var i = 0; i < scene.surfaces.length; i++){
        console.log("i = ", i);
        if (scene.surfaces[i].shape == "Sphere") {
            surfaces.push( new Sphere(scene.surfaces[i].center, scene.surfaces[i].radius, scene.surfaces[i].material) );
        }
        if (scene.surfaces[i].shape == "Triangle") {
            surfaces.push(new Triangle(scene.surfaces[i].p1, scene.surfaces[i].p2, scene.surfaces[i].p3, scene.surfaces[i].material));
        }

        if( scene.surfaces[i].hasOwnProperty('transforms') ){
            for( var j = 0; j < (scene.surfaces[i].transforms.length); j++ ){
                console.log("trasformata: ", j);
                if( scene.surfaces[i].transforms[j][0] == "Translate" ){
                    surfaces[i].traslazione( scene.surfaces[i].transforms[j][1] );
                }
                if( scene.surfaces[i].transforms[j][0] == "Rotate" ){
                    surfaces[i].rotazione( scene.surfaces[i].transforms[j][1] );
                }
                if( scene.surfaces[i].transforms[j][0] == "Scale" ){
                    surfaces[i].scala( scene.surfaces[i].transforms[j][1] );
                }
            }
        }
    }

    for(var i = 0; i < scene.materials.length; i++){
        materials.push( new Material( scene.materials[i].ka, scene.materials[i].kd, scene.materials[i].ks, scene.materials[i].shininess, scene.materials[i].kr ) );
    }

    for(var i = 0; i < scene.lights.length; i++){
        if( scene.lights[i].source == "Ambient" ){
            ambientLight.push( new AmbientLight(scene.lights[i].color) );
        }
        if( scene.lights[i].source == "Point" ){
            pointLight.push( new PointLight(scene.lights[i].color, scene.lights[i].position) );
            console.log("luce puntiforme: ", scene.lights[i]);
        }
        if( scene.lights[i].source == "Directional" ){
            directionalLight.push( new DirectionalLight(scene.lights[i].color, scene.lights[i].direction) );
        }
    }

}


//renders the scene
function render(){
    var h,w,u,v,s;
    var start = Date.now(); //for logging
    h = 2*Math.tan(rad(scene.camera.fovy/2.0));
    w = h * aspect;

    for (var i = 0; i <= canvas.width;  i++){ //indice bordo sinistro se i=0 (bordo destro se i = nx-1)
        for (var j = 0; j <= canvas.height; j++){
            u = (w*i/(canvas.width-1)) - w/2.0;
            v = (-h*j/(canvas.height-1)) + h/2.0;

            //TODO - fire a ray though each pixel
            var ray = camera.castRay(u, v);
            setPixel(i, j, trace(ray, scene.bounce_depth) );
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
        filename = 'assets/'+$('#scene_file_input').val()+'.json';
        init();
        render();
        console.log("renderizzato");
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
        var ray = camera.castRay(u,v); //cast a ray through the point
        console.log("ray = ", ray);
        var ray_transform = surfaces[0].hitSurface(ray);
        console.log("ray_transform = ", ray_transform);
        var t = surfaces[0].intersect(ray_transform);
        console.log("t = ", t);
        var point = ray_transform.pointAtParameter( t );
        console.log("point = ", point);
        var point_transform = surfaces[0].trasformation_point(point);
        console.log("point_transform = ", point_transform);
        var normale = surfaces[0].getNormal(point);
        console.log("normale = ", normale);
        console.log("shade = ", shadeP( ray_transform, point_transform, normale, pointLight[0], surfaces[0].materiale ) );
        console.log("-------------------------------------------");
        DEBUG = false;
    });


});
