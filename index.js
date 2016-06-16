import THREE from 'three';
var fs = require('fs');


let camera, scene, renderer;

let displacements, velocities;

let max_velocity = 1;
let boid_mass = 1;
let boid_force = 0.05;

init();


function init () {
    let body = document.getElementsByTagName('body')[0];
    body.style.margin = 0;
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10);
    camera.position.z = 2;

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();

    let triangles = 2;
    let instances = 250;

    let geometry = new THREE.InstancedBufferGeometry();

    geometry.maxInstancedCount = instances;

    let vertices = new THREE.BufferAttribute(new Float32Array(triangles * 3 * 3), 3);

    vertices.setXYZ(0, 0.025, 0.0125, -0.0125);
    vertices.setXYZ(1, 0.0, 0.0, 0.0125);
    vertices.setXYZ(2, 0.0, 0.0, 0.0);
    vertices.setXYZ(3, 0.0, 0.0, 0.0);
    vertices.setXYZ(4, -0.025, 0.0125, -0.0125);
    vertices.setXYZ(5, 0.0, 0.0, 0.0125);

    geometry.addAttribute('position', vertices);

    displacements = new THREE.InstancedBufferAttribute(new Float32Array(instances * 3), 3, 1);

    let vector = new THREE.Vector3();
    for (let i = 0, ul = displacements.count; i < ul; i++) {
        vector.set(
            Math.random() * 10 - 5,
            Math.random() * 10 - 5,
            Math.random() * 10 - 5
        ).normalize();
        displacements.setXYZ(i, vector.x, vector.y, vector.z);
    }

    geometry.addAttribute('displacement', displacements);

    velocities = new THREE.InstancedBufferAttribute(new Float32Array(instances * 3), 3, 1);

    //let vector = new THREE.Vector3();
    for (let i = 0, ul = velocities.count; i < ul; i++) {
        vector.set(0, 0, 0);
        velocities.setXYZ(i, vector.x, vector.y, vector.z);
    }

    geometry.addAttribute('velocity', velocities);

    let orientations = new THREE.InstancedBufferAttribute(new Float32Array(instances * 4), 4, 1);

    vector = new THREE.Vector4();
    for (let i = 0, ul = orientations.count; i < ul; i++) {
        vector.set(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        );
        vector.normalize();
        orientations.setXYZW(i, vector.x, vector.y, vector.z, vector.w);
    }

    geometry.addAttribute('orientation', orientations);

    var material = new THREE.RawShaderMaterial( {
        vertexShader: fs.readFileSync(__dirname + '/shaders/vertex.glsl', 'utf8'),
        fragmentShader: fs.readFileSync(__dirname + '/shaders/fragment.glsl', 'utf8'),
        side: THREE.DoubleSide,
        transparent: false
    } );

    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);


    renderer.setClearColor( 0xa0c0f0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth - 16, window.innerHeight - 16);
    body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
}


function onWindowResize( event ) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}


function animate(now) {

    render(now);
    requestAnimationFrame(animate);
}
let then = performance.now();

let currentV = new THREE.Vector3();
let currentVel = new THREE.Vector3();
let target = new THREE.Vector3(0, 0, 0);
let neg_loc = new THREE.Vector3();
let neg_vel = new THREE.Vector3();
let v_tmp = new THREE.Vector3();
let goal_steering_force = new THREE.Vector3();

function render (now) {
    renderer.render(scene, camera);
    let dt = (now - then) / 1000;
    then = now;
    if (isNaN(dt)) {
        return;
    }
    //console.log(dt);
    for (let i = 0, ul = displacements.count; i < ul; i++) {
        let index = i * 3;
        currentV.set(displacements.array[index], displacements.array[index + 1], displacements.array[index + 2]);
        currentVel.set(velocities.array[index], velocities.array[index + 1], velocities.array[index + 2]);
        
        neg_loc.copy(currentV);
        neg_loc.multiplyScalar(-1);

        neg_vel.copy(currentVel);
        neg_vel.multiplyScalar(-1);

        goal_steering_force.copy(target);
        goal_steering_force.add(neg_loc);
        goal_steering_force.normalize();
        goal_steering_force.multiplyScalar(max_velocity);
        goal_steering_force.add(neg_vel);
        goal_steering_force.normalize();

        goal_steering_force.multiplyScalar(boid_force);
        goal_steering_force.multiplyScalar(dt/boid_mass);
        //console.log(goal_steering_force);

        currentVel.add(goal_steering_force);
        currentVel.clampLength(0, max_velocity);
        v_tmp.copy(currentVel);
        v_tmp.multiplyScalar(dt);
        currentV.add(v_tmp);

        displacements.setXYZ(i, currentV.x, currentV.y, currentV.z);
        velocities.setXYZ(i, currentVel.x, currentVel.y, currentVel.z);

        /*
        mul(position, -1, neg_loc);
        mul(velocity, -1, neg_vel);
        // console.log(neg_loc, neg_vel);
        add(target, neg_loc, goal_steering_force);
        normalize(goal_steering_force, goal_steering_force);
        mul(goal_steering_force, max_boid_velocity, goal_steering_force);
        add(goal_steering_force, neg_vel, goal_steering_force);
        normalize(goal_steering_force, goal_steering_force);
        */
    }
    displacements.needsUpdate = true;
    velocities.needsUpdate = true;
}

requestAnimationFrame(animate);