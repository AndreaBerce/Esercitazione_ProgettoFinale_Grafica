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

//CLASSES PROTOTYPES
var Camera = function(eye, up, at){
    this.eye = glMatrix.vec3.fromValues(eye[0], eye[1], eye[2]);   // Posizione della camera  (e)
    this.up = glMatrix.vec3.fromValues(up[0], up[1], up[2]);     // Inclinazione testa        (t)
    this.at = glMatrix.vec3.fromValues(at[0], at[1], at[2]);     // Direzione dello sguardo   (g)

    //Ricavo il camera frame {u,v,w} dai vettori eye,at,up (lezione 8, slide 19)
    this.w = glMatrix.vec3.scale([], glMatrix.vec3.normalize([], this.at), -1);
    this.u = glMatrix.vec3.normalize([], glMatrix.vec3.cross([], this.up, this.w)); //normalize(up * w)
    this.v = glMatrix.vec3.cross([], this.w, this.u); //w * u;

    console.log("eye camera: ", this.eye);


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
var Sphere = function(centro, raggio, materiale){
    this.centro = glMatrix.vec3.fromValues(centro[0], centro[1], centro[2]);
    this.raggio = raggio;
    this.materiale = materiale;
    this.trasformate = glMatrix.mat4.create();
    this.trasformateI = glMatrix.mat4.create();
    console.log("sfera inserita");
    console.log("sfera", this.centro, this.raggio, this.materiale);

    this.intersect = function(ray){//Implementa formula sulle slide del prof
        var p = glMatrix.vec3.create();
        glMatrix.vec3.subtract(p, ray.p, this.centro); //e - c
        var d = ray.dir;

        var ddotp = glMatrix.vec3.dot(d,p);
        var psquare = glMatrix.vec3.dot(p, p);
        var dsquare = glMatrix.vec3.dot(d, d);

        var delta = ddotp*ddotp - dsquare*(psquare - this.raggio*this.raggio);
        if(delta >= 0){
            var t1 = (-ddotp + Math.sqrt(delta)) / dsquare;
            var t2 = (-ddotp - Math.sqrt(delta)) / dsquare;

            if(t1 > 0 && t1 < t2){
                return t1;
            }else{
                return t2;
            }
        }else{
            return false;
        }
    }

    this.hitSurface = function(ray){ //wrapper per debug
        var r = new Ray( glMatrix.vec3.transformMat4([], ray.p, this.trasformateI), glMatrix.vec3.transformMat4([], ray.dir, this.trasformateI) );
        return this.intersect(r);
    }

    this.traslazione = function(vettore){
        console.log("traslazione sfera");
        glMatrix.mat4.translate(this.trasformate, this.trasformate, vettore);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        this.centro[0] = this.centro[0] + vettore[0];
        this.centro[1] = this.centro[1] + vettore[1];
        this.centro[2] = this.centro[2] + vettore[2];
        console.log("centro: ", this.centro);
        console.log("traslazione: ", this.trasformate, this.trasformateI);
    }

    this.rotazione = function(vettore){
        console.log("rotazione sfera");
        if( vettore[0] != 0 ){
            glMatrix.mat4.rotateX(this.trasformate, this.trasformate, vettore[0]);
        }
        if( vettore[1] != 0 ){
            glMatrix.mat4.rotateY(this.trasformate, this.trasformate, vettore[1]);
        }
        if( vettore[2] != 0 ){
            glMatrix.mat4.rotateZ(this.trasformate, this.trasformate, vettore[2]);
        }
        //console.log("traslazione: ", this.trasformate, this.trasformateI);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
    }

    this.scala = function(vettore){
        console.log("scala sfera");
        glMatrix.mat4.scale(this.trasformate, this.trasformate, vettore);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        //console.log("traslazione: ", this.trasformate, this.trasformateI);
    }

    this.getNormal = function(point){
        return glMatrix.vec3.normalize([], glMatrix.vec3.subtract([], point, this.centro) );
    }

    this.shadeSLamb = function(ray, point, normale, light){
        var luce = glMatrix.vec3.normalize( [], glMatrix.vec3.subtract([], light.punto, point) );
        var temp = glMatrix.vec3.dot(luce, normale);
        if( !Math.max(0, temp) ){
            return [0, 0, 0];
        }
        return [materials[this.materiale].kd[0] * light.colore[0] * temp,
                materials[this.materiale].kd[1] * light.colore[1] * temp,
                materials[this.materiale].kd[2] * light.colore[2] * temp];
    }

    this.shadeSPhong = function(ray, point, normale, light){
        var v = glMatrix.vec3.normalize([], glMatrix.vec3.scale([], ray.dir, -1));
        var l = glMatrix.vec3.normalize( [], glMatrix.vec3.subtract([], light.punto, point) );
        var temp = 2 * glMatrix.vec3.dot(l, normale);
        var r = [temp * normale[0] - l[0],
                 temp * normale[1] - l[1],
                 temp * normale[2] - l[2]];
        var temp = glMatrix.vec3.dot(r, v);
        if( !Math.max(temp, 0) ){
            return [0, 0, 0];
        }
        temp = Math.pow(temp, materials[this.materiale].shininess);
        return [materials[this.materiale].ks[0] * light.colore[0] * temp,
                materials[this.materiale].ks[1] * light.colore[1] * temp,
                materials[this.materiale].ks[2] * light.colore[2] * temp];
    }

    this.shadeDLamb = function(ray, point, normale, light){
        var luce = glMatrix.vec3.normalize([], [-light.direzione[0], -light.direzione[1], -light.direzione[2]]);
        var temp = glMatrix.vec3.dot(luce, normale);
        if( !Math.max(0, temp) ){
            return [0, 0, 0];
        }
        return [materials[this.materiale].kd[0] * light.colore[0] * temp,
                materials[this.materiale].kd[1] * light.colore[1] * temp,
                materials[this.materiale].kd[2] * light.colore[2] * temp];
    }

    this.shadeDPhong = function(ray, point, normale, light){
        var v = glMatrix.vec3.normalize([], glMatrix.vec3.scale([], ray.dir, -1));
        var l = glMatrix.vec3.normalize([], [-light.direzione[0], -light.direzione[1], -light.direzione[2]]);
        var temp = 2 * glMatrix.vec3.dot(l, normale);
        var r = [temp * normale[0] - l[0],
                 temp * normale[1] - l[1],
                 temp * normale[2] - l[2]];
        temp = glMatrix.vec3.dot(r, v);
        if( !Math.max(temp, 0) ){
            return [0,0,0];
        }
        temp = Math.pow(temp, materials[this.materiale].shininess);
        return [materials[this.materiale].ks[0] * light.colore[0] * temp,
                materials[this.materiale].ks[1] * light.colore[1] * temp,
                materials[this.materiale].ks[2] * light.colore[2] * temp];
    }
}

var Triangle = function(p1, p2, p3, material){
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.material = material;
}

//Ray-Intersect
var Ray = function(p, dir){
    this.p = p; //origine
    this.dir = dir; //direzione

    this.pointAtParameter = function( t ){//return A + t * d
        var tmp;
        tmp = glMatrix.vec3.add([], this.p, glMatrix.vec3.scale([], this.dir, t)); //non si capisce niente così
        return tmp;
    }
}

var Intersection = function(x, y, z){
    this.int = new glMatrix.vec3(x, y, z);
}

//Lighting
var AmbientLight = function(colore){
    this.colore = colore;
    console.log("luce ambientale: ", colore);
}

var PointLight = function(colore, punto){
    this.colore = colore;
    this.punto = punto;
}

var DirectionalLight = function(colore, direzione){
    this.colore = colore;
    this.direzione = direzione;
    console.log("luce dirzionale: ", direzione);
}

var Material = function(ka, kd, ks, shininess, kr){
    this.ka = ka;
    this.kd = kd;
    this.ks = ks;
    this.shininess = shininess;
    this.kr = kr;
    console.log("shininess: ", shininess);
}


//initializes the canvas and drawing buffers
function init(){
    canvas = $('#canvas')[0];
    context = canvas.getContext("2d");
    imageBuffer = context.createImageData(canvas.width, canvas.height); //buffer for pixels

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
        // if (scene.surfaces[i].shape == "Triangle") {
        //     surfaces.push(new Triangle(scene.surfaces[i].p1, scene.surfaces[i].p2, scene.surfaces[i].p3, scene.surfaces[i].material));
        // }


    }

    for(var i = 0; i < scene.materials.length; i++){
        materials.push( new Material( scene.materials[i].ka, scene.materials[i].kd, scene.materials[i].ks, scene.materials[i].shininess, scene.materials[i].kr ) );
        //console.log("Materiale: ", scene.materials[i].ka, scene.materials[i].kd, scene.materials[i].ks, scene.materials[i].shininess, scene.materials[i].kr);
    }

    for(var i = 0; i < scene.lights.length; i++){
        if( scene.lights[i].source == "Ambient" ){
            ambientLight.push( new AmbientLight(scene.lights[i].color) );
        }
        if( scene.lights[i].source == "Point" ){
            pointLight.push( new PointLight(scene.lights[i].color, scene.lights[i].position) );
        }
        if( scene.lights[i].source == "Directional" ){
            directionalLight.push( new DirectionalLight(scene.lights[i].color, scene.lights[i].direction) );
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

            var t = false;
            var temp = false;
            var temp2;
            //console.log("surfaces.length = ", surfaces.length);
            for( var k = 0; k < surfaces.length; k++ ){
                //calculate the intersection of that ray with the scene
                temp = surfaces[k].hitSurface(ray);
                if( temp != false && ( temp < t || t == false) ){
                    t = temp;
                    temp2 = k;
                }
            }
            //set the pixel to be the color of that intersection (using setPixel() method)
            if(t == false){
                setPixel(i, j, backgroundcolor);
            }
            else{
                var point = ray.pointAtParameter( t );
                var normale = surfaces[temp2].getNormal(point);
                // surfaces[temp2].shade(ray, point, normale, pointLight[0])
                var l = glMatrix.vec3.create();
                var la = glMatrix.vec3.create();
                for( var k = 0; k < ambientLight.length; k++ ){
                    la[0] = la[0] + materials[surfaces[temp2].materiale].ka[0] * ambientLight[k].colore[0];
                    la[1] = la[1] + materials[surfaces[temp2].materiale].ka[1] * ambientLight[k].colore[1];
                    la[2] = la[2] + materials[surfaces[temp2].materiale].ka[2] * ambientLight[k].colore[2];
                }
                var ld = glMatrix.vec3.create();
                for( var k = 0; k < directionalLight.length; k++ ){
                    glMatrix.vec3.add( ld, ld, surfaces[temp2].shadeDLamb( ray, point, normale, directionalLight[k] ) );
                    glMatrix.vec3.add( ld, ld, surfaces[temp2].shadeDPhong( ray, point, normale, directionalLight[k] ) );
                }
                var ls = glMatrix.vec3.create();
                for( var k = 0; k < pointLight.length; k++ ){
                    glMatrix.vec3.add( ld, ld, surfaces[temp2].shadeSLamb( ray, point, normale, pointLight[k] ) );
                    glMatrix.vec3.add( ls, ls, surfaces[temp2].shadeSPhong( ray, point, normale, pointLight[k] ) );
                }
                glMatrix.vec3.add(l, la, glMatrix.vec3.add([], ld, ls) );
                setPixel(i, j, l);
            }
        }
    }
    console.log("m: ", materials[ surfaces[0].materiale ].ka);
    console.log("a: ", ambientLight[0].colore);
    var la = glMatrix.vec3.create();
    la[0] = la[0] + materials[surfaces[0].materiale].ka[0] * ambientLight[0].colore[0];
    la[1] = la[1] + materials[surfaces[0].materiale].ka[1] * ambientLight[0].colore[1];
    la[2] = la[2] + materials[surfaces[0].materiale].ka[2] * ambientLight[0].colore[2];
    console.log("la: ", la );
    console.log("directionalLight: ", directionalLight);
    console.log("pointLight: ", pointLight);
    console.log("count = ", surfaces[0].count);
    console.log("temp = ", surfaces[0].temp);
    // var point = ray.pointAtParameter( t );
    // var normale = surfaces[temp2].getNormal(point);
    // console.log(surfaces[temp2].shade(ray, point, normale, pointLight[0]));

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
        camera.castRay(u,v); //cast a ray through the point
        DEBUG = false;
    });

});
