//CORE VARIABLES
var canvas;
var context;
var imageBuffer;

var DEBUG = false; //whether to show debug messages

var EPSILON;

//vettori contenenti tutti gli elementi della scena da renderizzare
var scene;
var camera;
var surfaces;
var materials;
var ambientLight;
var pointLight;
var directionalLight;

var filename = "assets/SphereTest.json";

/*Camera:
    Rappresenta la camera prospettica presente nella scena virtuale.

    Metodi:
        castRay
*/
class Camera{
    constructor(eye,up,at,fovy,aspect){
        this.eye      = eye;
        this.at       = at;
        this.up       = up;
        this.fovy     = fovy;
        this.aspect   = aspect;
        this.h        = 2*Math.tan(rad(fovy/2));
        this.w        = aspect * this.h;
        this.vpMatrix = glMatrix.mat4.create();
        //glMatrix.mat4.targetTo crea la matrice lookAt e la inverte
        glMatrix.mat4.targetTo(this.vpMatrix, [eye[0],eye[1],eye[2]], [at[0],at[1],at[2]], [up[0],up[1],up[2]]);
    }

    /*castRay:
        Genera il raggio con centro l'occhio della camera e la direzione che passa attraverso il pixel di coordinate (x, y)

        SYNOPSIS:
            ray = camera.castRay(x, y)
        INPUT:
            x, y: coordinate della matrice di visione
        OUTPUT:
            oggetto ray, rappresentante il raggio dell'osservatore
    */
    castRay(x,y){
        var u = (this.w*x/(canvas.width-1)) - this.w/2.0;
        var v = (-this.h*y/(canvas.height-1)) + this.h/2.0;
        var d = -1;
        var rayDir = glMatrix.vec4.create();
        glMatrix.mat4.multiply(rayDir,this.vpMatrix,[u,v,d,0]);
        return new Ray(this.eye, [rayDir[0],rayDir[1],rayDir[2]]);
    }
}



/*Surface:
    superclasse per Sphere e Triangle. Contiene e gestisce le matrici di trasformazioni per gli oggetti della scena da rappresentare
*/
class Surface{
    constructor(materiale){
        this.materiale      = materiale;
        this.trasformate    = glMatrix.mat4.create();
        this.trasformateI   = glMatrix.mat4.invert([], this.trasformate);
        this.trasformateIT  = glMatrix.mat4.transpose([], this.trasformateI);
    }

    /*traslazione:
        Traspone la matrice delle trasformate

        SYNOPSIS:
            superficie.traslazione( vettore )
        INPUT:
            vettore: corrisponde alle traslazioni da effetuare
        OUTPUT:
            void
    */
    traslazione(vettore){
        glMatrix.mat4.translate(this.trasformate, this.trasformate, vettore);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        glMatrix.mat4.transpose(this.trasformateIT, this.trasformateI);
    }

    /*rotazione:
        Ruota la matrice delle trasformate

        SYNOPSIS:
            superficie.rotazione( vettore )
        INPUT:
            vettore: corrisponde alle rotazioni da effetuare
        OUTPUT:
            void
    */
    rotazione(vettore){
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
    }

    /*scala:
        Scala la matrice delle trasformate

        SYNOPSIS:
            superficie.scala( vettore )
        INPUT:
            vettore: corrisponde alle scalature da effetuare
        OUTPUT:
            void
    */
    scala(vettore){
        glMatrix.mat4.scale(this.trasformate, this.trasformate, vettore);
        glMatrix.mat4.invert(this.trasformateI, this.trasformate);
        glMatrix.mat4.transpose(this.trasformateIT, this.trasformateI);
    }

    /*hitSurface:
        trasforma il raggio ray in base alle trasformate dell'oggetto

        SYNOPSIS:
            superficie.hitSurface( ray )
        INPUT:
            ray: raggio da trasformare
        OUTPUT:
            oggetto ray
    */
    hitSurface(ray){
        var temp = glMatrix.mat4.multiply([], this.trasformateI, [ray.p[0], ray.p[1], ray.p[2], 1]);
        var temp2 = glMatrix.mat4.multiply([], this.trasformateI, [ray.dir[0], ray.dir[1], ray.dir[2], 0]);
        return new Ray( [temp[0], temp[1], temp[2]], [temp2[0], temp2[1], temp2[2]] );
    }

    /*trasformation_point:
        cambia le coordinate del punto dal riferimento mondo a quello di questo oggetto 

        SYNOPSIS:
            superficie.trasformation_point( point )
        INPUT:
            point: punto da trasformare
        OUTPUT:
            point
    */
    trasformation_point(point){
        var temp = glMatrix.mat4.multiply([], this.trasformate, [point[0], point[1], point[2], 1]);
        return glMatrix.vec3.fromValues(temp[0], temp[1], temp[2]);
    }
}


/*Sphere:
    sottoclasse di Surface
*/
class Sphere extends Surface{
    constructor(centro, raggio, materiale){
        super(materiale);
        this.centro  = centro;
        this.raggio  = raggio;
        this.raggio2 = raggio*raggio;
    }

    /*intersect:
        calcolo distanza tra il punto di osservazione e l'oggetto

        SYNOPSIS:
            t = superficie.intersect( ray_transform )
        INPUT:
            ray_transform: raggio osservatore trasformato
        OUTPUT:
            t:             distanza tra il punto di vista e l'oggetto colpito lungo il vettore direzione
    */
    intersect(ray){
        var p  = glMatrix.vec3.subtract([], ray.p, this.centro);
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

    /*getNormal:
        calcolo vettore normale corrispondente al punto point che appartiene all'oggetto

        SYNOPSIS:
            normale = superficie.getNormal( point, ray_transform )
        INPUT:
            point:   punto appartenente all'oggetto
            ray:     raggio osservatore trasformato
        OUTPUT:
            normale: normale nel punto appartenente all'oggetto
    */
    getNormal(point, ray){
        var temp = glMatrix.vec3.subtract([], point, this.centro );
        glMatrix.mat4.multiply( temp, this.trasformateIT, [temp[0], temp[1], temp[2], 0] );
        return glMatrix.vec3.normalize([], glMatrix.vec3.fromValues(temp[0], temp[1], temp[2]) );
    }
}


class Triangle extends Surface{
    constructor(p1, p2, p3, materiale){
        super(materiale);
        this.a = p1;
        this.b = p2;
        this.c = p3;
        this.materiale = materiale;
    }

   /*intersect:
        calcolo distanza tra il punto di osservazione e l'oggetto

        SYNOPSIS:
            t = superficie.intersect( ray_transform )
        INPUT:
            ray_transform: raggio osservatore trasformato
        OUTPUT:
            t:             distanza tra il punto di vista e l'oggetto colpito lungo il vettore direzione
    */
    intersect(ray){
        var ab = glMatrix.vec3.subtract([], this.a, this.b);
        var ac = glMatrix.vec3.subtract([], this.a, this.c);
        var d  =  ray.dir;
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
        if( gamma < 0 || gamma > 1 ){
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

    /*getNormal:
        calcolo vettore normale corrispondente al punto point che appartiene all'oggetto

        SYNOPSIS:
            normale = superficie.getNormal( point, ray_transform )
        INPUT:
            point:   punto appartenente all'oggetto
            ray:     raggio osservatore trasformato
        OUTPUT:
            normale: normale nel punto appartenente all'oggetto
    */
    getNormal(point, ray){
        var temp1 = glMatrix.vec3.subtract([], this.c, this.a);
        var temp2 = glMatrix.vec3.subtract([], this.b, this.a);
        temp1 = glMatrix.vec3.cross([], temp1, temp2);
        glMatrix.vec3.normalize( temp1, temp1);
        if( glMatrix.vec3.dot( temp1, ray.dir ) > 0 ){
            glMatrix.vec3.scale( temp1, temp1, -1.0 );
        }
        glMatrix.mat4.multiply( temp1, this.trasformateIT, [temp1[0], temp1[1], temp1[2], 0] );
        return glMatrix.vec3.normalize([], glMatrix.vec3.fromValues(temp1[0], temp1[1], temp1[2]) );
    }
}



/*ShadeA:
    shader luce ambientale

    SYNOPSIS:
        colore = shadeA( superficie.materiale, k )
    INPUT:
        materiale: indice materiale sul vettore materials da usare
        k:         indice luce ambientale sul vettore ambientLight
    OUTPUT:
        colore:    colore risultante
*/
function shadeA(materiale, k){
    return glMatrix.vec3.fromValues(materials[materiale].ka[0] * ambientLight[k].colore[0],
                                    materials[materiale].ka[1] * ambientLight[k].colore[1],
                                    materials[materiale].ka[2] * ambientLight[k].colore[2]);
}


/*ShadeP:
    shader luce puntiforme

    SYNOPSIS:
        colore = shadeP( ray, point, normale, pointLight, materiale )
    INPUT:
        ray:          raggio osservatore
        point:        punto su cui effetuare il calcolo
        normale:      nomale corrispondente al punto dell'oggetto
        pointLight:   luce puntiforme su cui efettuare il calcolo
        materiale:    indice materiale sul vettore materials da usare
    OUTPUT:
        colore:       colore risultante
*/
function shadeP(ray, point, normale, light, materiale){
    return shadeG(ray, point, normale, light.colore, glMatrix.vec3.normalize( [], glMatrix.vec3.subtract([], light.punto, point ) ), materiale, glMatrix.vec3.distance(point, light.punto) );
}

/*ShadeD:
    shader luce direzionale

    SYNOPSIS:
        colore = shadeD( ray, point, normale, directionalLight, materiale )
    INPUT:
        ray:                raggio osservatore
        point:              punto su cui effetuare il calcolo
        normale:            nomale corrispondente al punto dell'oggetto
        directionalLight:   luce direzionale su cui efettuare il calcolo
        materiale:          indice materiale sul vettore materials da usare
    OUTPUT:
        colore:             colore risultante
*/
function shadeD(ray, point, normale, light, materiale){
    return shadeG(ray, point, normale, light.colore, glMatrix.vec3.normalize([], [-light.direzione[0], -light.direzione[1], -light.direzione[2]]), materiale, Infinity );
}

/*ShadeG:
    shader generico. Usato per la luce puntiforme e direzionale

    SYNOPSIS:
        colore = shadeG( ray, point, normale, Light, l, materiale )
    INPUT:
        ray:        raggio osservatore
        point:      punto su cui effetuare il calcolo
        normale:    nomale corrispondente al punto dell'oggetto
        light:      luce direzionale su cui efettuare il calcolo
        l:          vettore direzione luce
        materiale:  indice materiale sul vettore materials da usare
        distanza:   distanza da cui si trova la luce
    OUTPUT:
        colore:     colore risultante
*/
function shadeG(ray, point, normale, light, l, materiale, distanza){
    // ombra, verifico che non esistano superfici tra il punto e la luce
    var r = new Ray(point, l);
    var temp_ray, temp, t_min = false;
    for( var k = 0; k < surfaces.length; k++ ){
        //calculate the intersection of that ray with the scene
        temp_ray = surfaces[k].hitSurface(r);
        temp = surfaces[k].intersect(temp_ray);
        if( temp != false && temp > 0 && temp < distanza){
            t_min = temp;
            break;
        }
    }
    if(t_min != false){ // ombra
        return [0,0,0];
    }else{  // nessuna ombra
        //Lambert
        var temp = glMatrix.vec3.dot(l, normale);
        var colore = [0,0,0];
        if( Math.max(0, temp) ){
            colore = [materials[materiale].kd[0] * light[0] * temp,
                      materials[materiale].kd[1] * light[1] * temp,
                      materials[materiale].kd[2] * light[2] * temp];
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
            colore = [materials[materiale].ks[0] * light[0] * temp + colore[0],
                      materials[materiale].ks[1] * light[1] * temp + colore[1],
                      materials[materiale].ks[2] * light[2] * temp + colore[2]];
        }
        return colore;
    }
}


/*trace:
    funzione che si occupa di verificare se il raggio dato interseca un qualunque oggetto.
    Nel caso negativo, restituisce il colore nero.
    Nel caso positivo, calcola il colore del punto intersecato, dell'oggetto più vicino all'origine del raggio, su tutte le luci, 
    verificando che non sia in obra e se neccessario si itera per calcolare la riflessione della superficie
    
    SYNOPSIS:
        colore = trace(ray , nRiflessioni)
    INPUT:
        ray:            raggio osservatore
        nRiflessioni:   numero riflessioni da eseguire
    OUTPUT:
        colore:         colore risultante
*/
function trace(ray, nRiflessioni){
    var t_min = false;
    var temp_ray;
    var temp = false;
    var k_min;
    var ray_min;
    for( var k = 0; k < surfaces.length; k++ ){//calcolo intersezione raggio sfera
        temp_ray = surfaces[k].hitSurface(ray);
        temp = surfaces[k].intersect(temp_ray);
        if( temp != false && ( temp < t_min || t_min == false) && EPSILON < temp ){
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
        var normale = surfaces[k_min].getNormal(point, ray_min);
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
        if( nRiflessioni > 0 && (   materials[surfaces[k_min].materiale].kr[0] != 0
                                 || materials[surfaces[k_min].materiale].kr[1] != 0
                                 || materials[surfaces[k_min].materiale].kr[2] != 0 ) ){
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



/*Ray:
    classe oggetto ray
*/
class Ray{
    constructor(p, dir){
        this.p   = p;     //origine
        this.dir = dir;   //direzione
    }

    /*pointAtParameter:
        calcolo punto dato la distanza dal punto di osservazione

        SYNOPSIS:
            point = ray.pointAtParameter( t )
        INPUT:
            t:      distanza dal punto di osservazione
        OUTPUT:
            point:  punto risultante
    */
    pointAtParameter( t ){//return A + t * d
        return glMatrix.vec3.add([], this.p, glMatrix.vec3.scale([], this.dir, t));
    }
}


//classi dell luci ambientali, puntifomi e direzionali
class AmbientLight{
    constructor(colore){
        this.colore = colore;
    }
}

class PointLight{
    constructor(colore, punto){
        this.colore = colore;
        this.punto  = punto;
    }
}

class DirectionalLight{
    constructor(colore, direzione){
        this.colore    = colore;
        this.direzione = direzione;
    }
}


//classe Material
class Material{
    constructor(ka, kd, ks, shininess, kr){
        this.ka         = ka;
        this.kd         = kd;
        this.ks         = ks;
        this.shininess  = shininess;
        this.kr         = kr;
    }
}


/*init:
    inizializzazione della canvas, preparazione buffer dei pixel e caricamento di tutti gli oggetti della scena sui rispettivi vettori

    SYNOPSIS:
        init()
*/
function init(){
    canvas           = $('#canvas')[0];
    context          = canvas.getContext("2d");
    imageBuffer      = context.createImageData(canvas.width, canvas.height); //buffer dei pixel

    surfaces         = new Array();
    materials        = new Array();
    ambientLight     = new Array();
    pointLight       = new Array();
    directionalLight = new Array();

    loadSceneFile(filename);
}


/*loadSceneFile:
    lettura del file passato e caricamento di tutti gli oggetti della scena sui rispettivi vettori

    SYNOPSIS:
        loadSceneFile(filepath)
    INPUT:
        filepath:   path del file da renderizzare
*/
function loadSceneFile(filepath){
    scene = Utils.loadJSON(filepath); //caricamento di scene

    console.log(scene.camera);

    EPSILON = scene.shadow_bias;
    camera = new Camera(scene.camera.eye, scene.camera.up, scene.camera.at, scene.camera.fovy, scene.camera.aspect);

    for(var i = 0; i < scene.surfaces.length; i++){
        if (scene.surfaces[i].shape == "Sphere") {
            surfaces.push( new Sphere(scene.surfaces[i].center, scene.surfaces[i].radius, scene.surfaces[i].material) );
        }
        if (scene.surfaces[i].shape == "Triangle") {
            surfaces.push(new Triangle(scene.surfaces[i].p1, scene.surfaces[i].p2, scene.surfaces[i].p3, scene.surfaces[i].material));
        }

        if( scene.surfaces[i].hasOwnProperty('transforms') ){
            for( var j = 0; j < (scene.surfaces[i].transforms.length); j++ ){
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
        }
        if( scene.lights[i].source == "Directional" ){
            directionalLight.push( new DirectionalLight(scene.lights[i].color, scene.lights[i].direction) );
        }
    }

}


/*render:
    renders della scena

    SYNOPSIS:
        render()
*/
function render(){
    var start = Date.now();

    for (var i = 0; i <= canvas.width;  i++){
        for (var j = 0; j <= canvas.height; j++){
            var ray = camera.castRay(i, j);
            setPixel(i, j, trace(ray, scene.bounce_depth) );
        }
    }

    //carica immagine calcolata
    context.putImageData(imageBuffer,0,0);

    var end = Date.now();
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

        var ray = camera.castRay(x, y);
        console.log("ray = ", ray);

        var k = 0;
        var ray_transform = surfaces[k].hitSurface(ray);
        console.log("ray_transform = ", ray_transform);
        var t = surfaces[k].intersect(ray_transform);
        console.log("t = ", t);
        if( t != false ){
            var point = ray_transform.pointAtParameter( t );
            console.log("point = ", point);
            var point_transform = surfaces[k].trasformation_point(point);
            console.log("point_transform = ", point_transform);
            var normale = surfaces[k].getNormal(point, ray_transform);
            console.log("normale = ", normale);
            console.log("shade = ", shadeG( ray_transform, point_transform, normale, pointLight[0], surfaces[k].materiale ) );
        }
        console.log("-------------------------------------------");
        DEBUG = false;
    });


});
