import THREE from 'three';
var fs = require('fs');


let camera, scene, renderer;

let displacements, velocities, orientations;

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

    const triangles = 4;
    const instances = 2500;

    const geometry = new THREE.InstancedBufferGeometry();

    geometry.maxInstancedCount = instances;

    let vertices = new THREE.BufferAttribute(new Float32Array(triangles * 3 * 3), 3);

    vertices.setXYZ(0, 0.025, 0.0125, -0.0125);
    vertices.setXYZ(1, 0.0, 0.0, 0.0);
    vertices.setXYZ(2, 0.0, 0.0, 0.0125);

    vertices.setXYZ(3, 0.0, 0.0, 0.0);
    vertices.setXYZ(4, 0.0, 0.0, 0.0125);
    vertices.setXYZ(5, -0.025, 0.0125, -0.0125);

    vertices.setXYZ(6, 0.025, 0.0125, -0.0125);
    vertices.setXYZ(7, 0.0, 0.0, 0.0125);
    vertices.setXYZ(8, 0.0, 0.0, 0.0);

    vertices.setXYZ(9, 0.0, 0.0, 0.0);
    vertices.setXYZ(10, -0.025, 0.0125, -0.0125);
    vertices.setXYZ(11, 0.0, 0.0, 0.0125);

    geometry.addAttribute('position', vertices);

    let normals = new THREE.BufferAttribute(new Float32Array(triangles * 3 * 3), 3); // one normal per vertex

    let right_wing_up_normal = (new THREE.Vector3(0.0, 0.0, -0.0125)).cross(new THREE.Vector3(0.025, 0.0125, -0.0125)); //.multiplyScalar(-1);
    let right_wing_down_normal = (new THREE.Vector3()).copy(right_wing_up_normal).multiplyScalar(-1);
    let left_wing_up_normal = (new THREE.Vector3(0.025, -0.0125, 0.0125)).cross(new THREE.Vector3(0.0, 0.0, 0.0125)); //.multiplyScalar(-1);
    let left_wing_down_normal = (new THREE.Vector3()).copy(left_wing_up_normal).multiplyScalar(-1);
    normals.setXYZ(0, right_wing_up_normal.x, right_wing_up_normal.y, right_wing_up_normal.z);
    normals.setXYZ(1, right_wing_up_normal.x, right_wing_up_normal.y, right_wing_up_normal.z);
    normals.setXYZ(2, right_wing_up_normal.x, right_wing_up_normal.y, right_wing_up_normal.z);
    normals.setXYZ(3, left_wing_up_normal.x, left_wing_up_normal.y, left_wing_up_normal.z);
    normals.setXYZ(4, left_wing_up_normal.x, left_wing_up_normal.y, left_wing_up_normal.z);
    normals.setXYZ(5, left_wing_up_normal.x, left_wing_up_normal.y, left_wing_up_normal.z);
    normals.setXYZ(6, right_wing_down_normal.x, right_wing_down_normal.y, right_wing_down_normal.z);
    normals.setXYZ(7, right_wing_down_normal.x, right_wing_down_normal.y, right_wing_down_normal.z);
    normals.setXYZ(8, right_wing_down_normal.x, right_wing_down_normal.y, right_wing_down_normal.z);
    normals.setXYZ(9, left_wing_down_normal.x, left_wing_down_normal.y, left_wing_down_normal.z);
    normals.setXYZ(10, left_wing_down_normal.x, left_wing_down_normal.y, left_wing_down_normal.z);
    normals.setXYZ(11, left_wing_down_normal.x, left_wing_down_normal.y, left_wing_down_normal.z);

    geometry.addAttribute('normal', normals);

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

    orientations = new THREE.InstancedBufferAttribute(new Float32Array(instances * 4), 4, 1);

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


    let light = new THREE.Vector3(350.0, 350.0, 350.0);
    // light.normalize();
    var material = new THREE.RawShaderMaterial( {
        uniforms: {
            light: { type: 'v3', value: light }
        },
        vertexShader: fs.readFileSync(__dirname + '/shaders/vertex.glsl', 'utf8'),
        fragmentShader: fs.readFileSync(__dirname + '/shaders/fragment.glsl', 'utf8'),
        side: THREE.FrontSide,
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
let currentO = new THREE.Quaternion();
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
        //currentO.set(orientations.array[index], orientations.array[index + 1], orientations.array[index + 2]);
        v_tmp.copy(currentVel);
        v_tmp.normalize();
        currentO.setFromAxisAngle(v_tmp, Math.PI / 2);
        orientations.setXYZW(i, currentO.x, currentO.y, currentO.z, currentO.w);
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
    orientations.needsUpdate = true;
}

requestAnimationFrame(animate);
