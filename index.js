import THREE from 'three';
import {BTMap} from 'ibtree';
var createTree = require('yaot');
var fs = require('fs');
var interleave = require('bit-interleave');


let camera, scene, renderer;

let displacement_buffer, displacements, velocities, orientations;

let max_velocity = 1.0;
let boid_mass = 8;
let boid_force = 2.5;

let hawk_displacement_buffer, hawk_displacements, hawk_velocities, hawk_orientations;

let hawk_max_velocity = 2.5;
let hawk_mass = 5;
let hawk_force = 5;
let hawk_search_vector = new THREE.Vector3(2, 2, 2);

const hawk_count = 1;

let sorted, tree, neighbours, neighbourhood = 4.0;


let GOAL_WEIGHT = 3.5;
let SEPARATION_WEIGHT = 4.5;
let HEADING_WEIGHT = 2.8;
let COHESION_WEIGHT = 3.6;
let HAWK_AVOIDANCE_WEIGHT = 1.5;

let gravity = new THREE.Vector3(0.0, 0.0, 0.0);

init();


function init() {
    let body = document.getElementsByTagName('body')[0];
    body.style.margin = 0;
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 50);
    camera.position.z = 4;

    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();

    const triangles = 4;
    const instances = 1500;


    const hawks = new THREE.InstancedBufferGeometry();

    hawks.maxInstancedCount = hawk_count;

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

    hawks.addAttribute('position', vertices);

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

    hawks.addAttribute('normal', normals);

    displacement_buffer = new Float32Array(instances * 3);
    displacements = new THREE.InstancedBufferAttribute(displacement_buffer, 3, 1);

    let vector = new THREE.Vector3();
    for (let i = 0, ul = displacements.count; i < ul; i++) {
        vector.set(
            Math.random() * 6 - 1.5,
            Math.random() * 6 - 1.5,
            Math.random() * 6 - 1.5
        );
        displacements.setXYZ(i, vector.x, vector.y, vector.z);
    }

    geometry.addAttribute('displacement', displacements);

    hawk_displacement_buffer = new Float32Array(hawk_count * 3);
    hawk_displacements = new THREE.InstancedBufferAttribute(hawk_displacement_buffer, 3, 1);

    for (let i = 0, ul = hawk_displacements.count; i < ul; i ++) {
        vector.set(
            5 - Math.random() * 10,
            5 - Math.random() * 10,
            5 - Math.random() * 10
        );
        hawk_displacements.setXYZ(i, vector.x, vector.y, vector.z);
    }

    hawks.addAttribute('displacement', hawk_displacements);

    tree = new BTMap();
    for (let i = 0, j = 0, k = 0, ul = displacements.count; i < ul; i++) {
        j = i * 3;
        k = interleave_from_vector(displacement_buffer[j], displacement_buffer[j + 1], displacement_buffer[j + 2]);
        tree = tree.set(k, i);
    }

    velocities = new THREE.InstancedBufferAttribute(new Float32Array(instances * 3), 3, 1);

    //let vector = new THREE.Vector3();
    for (let i = 0, ul = velocities.count; i < ul; i++) {
        vector.set(0, -0, 0);
        velocities.setXYZ(i, vector.x, vector.y, vector.z);
    }

    geometry.addAttribute('velocity', velocities);

    hawk_velocities = new THREE.InstancedBufferAttribute(new Float32Array(hawk_count * 3), 3, 1);

    for (let i = 0, ul = hawk_velocities.count; i < ul; i ++) {
        vector.set(0, 0, 0);
        hawk_velocities.setXYZ(i, vector.x, vector.y, vector.z);
    }

    hawks.addAttribute('velocity', hawk_velocities);

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

    hawk_orientations = new THREE.InstancedBufferAttribute(new Float32Array(instances * 4), 4, 1);

    vector = new THREE.Vector4();
    for (let i = 0, ul = hawk_orientations.count; i < ul; i++) {
        vector.set(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        );
        vector.normalize();
        hawk_orientations.setXYZW(i, vector.x, vector.y, vector.z, vector.w);
    }

    hawks.addAttribute('orientation', hawk_orientations);


    let light = new THREE.Vector3(350.0, 350.0, 350.0);
    // light.normalize();
    const vertexShader = fs.readFileSync(__dirname + '/shaders/vertex.glsl', 'utf8');
    const fragmentShader = fs.readFileSync(__dirname + '/shaders/fragment.glsl', 'utf8');
    var material = new THREE.RawShaderMaterial({
        uniforms: {
            light: {value: light},
            colour: {
                value: new THREE.Vector3(0.0, 0.0, 5.0)
            },
            scale: {value: 1}
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.FrontSide,
        transparent: false
    });

    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    var hawk_material = new THREE.RawShaderMaterial({
        uniforms: {
            light: {
                value: light
            },
            colour: {
                value: new THREE.Vector3(50.0, 0.0, 0.0)
            },
            scale: {value: 5.0}
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });

    var hawk_mesh = new THREE.Mesh(hawks, hawk_material);
    scene.add(hawk_mesh);


    renderer.setClearColor(0xa0c0f0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth - 16, window.innerHeight - 16);
    body.appendChild(renderer.domElement);
    window.addEventListener('resize', onWindowResize, false);
}


function onWindowResize(event) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function animate(now) {

    render(now);
    requestAnimationFrame(animate);
}
let then = performance.now(), last_octree_update = performance.now();

let currentV = new THREE.Vector3();
let currentVel = new THREE.Vector3();
let currentO = new THREE.Quaternion();
let target = new THREE.Vector3(0, 0, 0);
let neg_loc = new THREE.Vector3();
let neg_vel = new THREE.Vector3();
let v_tmp = new THREE.Vector3();
let tmp_1 = new THREE.Vector3();
let tmp_2 = new THREE.Vector3();
let goal_steering_force = new THREE.Vector3();

let separation = new THREE.Vector3(),
    heading = new THREE.Vector3(),
    cohesion = new THREE.Vector3(),
    avoid_hawks = new THREE.Vector3(),
    neighbour_position = new THREE.Vector3(),
    neighbour_velocity = new THREE.Vector3();

let lo = new THREE.Vector3(), hi = new THREE.Vector3(), neighbourhood_v = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(neighbourhood);


function interleave_from_vector(x, y, z) {
    return interleave[3](x << 9, y << 9, z << 9);
}

function render(now) {
    renderer.render(scene, camera);
    let dt = (now - then) / 1000;
    then = now;
    if (isNaN(dt)) {
        return;
    }
    if (dt > 0.2) {
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

        // do neighbour calculations here
        //neighbours = octree.intersectSphere(currentV.x, currentV.y, currentV.z, neighbourhood);
        lo.copy(currentV);
        lo.addScaledVector(neighbourhood_v, -1);
        hi.copy(currentV);
        hi.add(neighbourhood_v);
        // console.log(lo, hi);

        neighbours = Array.from(tree.values(
            interleave_from_vector(lo.x, lo.y, lo.z),
            interleave_from_vector(hi.x, hi.y, hi.z)
        ));
        if (neighbours.length) {
            // console.log("neighbours:", neighbours);
            separation.set(0, 0, 0);
            heading.set(0, 0, 0);
            cohesion.set(0, 0, 0);
            for (let j = 0, nl = neighbours.length, ni; j < nl; j++) {
                ni = neighbours[j] * 3;
                neighbour_position.set(displacement_buffer[ni], displacement_buffer[ni + 1], displacement_buffer[ni + 2]);
                neighbour_velocity.set(displacement_buffer[ni], displacement_buffer[ni + 1], displacement_buffer[ni + 2])
                tmp_1.copy(neg_loc).add(neighbour_position); // neighbour displacement
                separation.add(tmp_1);

                neighbour_velocity.normalize();
                heading.add(tmp_1);

                cohesion.add(neighbour_position);
            }
            separation.multiplyScalar(-1).normalize();
            heading.normalize();
            cohesion.multiplyScalar(1/neighbours.length);
            cohesion.add(neg_loc);
            cohesion.normalize();

            goal_steering_force.multiplyScalar(GOAL_WEIGHT);
            goal_steering_force.addScaledVector(separation, SEPARATION_WEIGHT);
            goal_steering_force.addScaledVector(heading, HEADING_WEIGHT);
            goal_steering_force.addScaledVector(cohesion, COHESION_WEIGHT);

            goal_steering_force.normalize();

        }
        // end neighbour calculations

        // avoid hawks
        avoid_hawks.set(0, 0, 0);
        for (let j = 0, l; j < hawk_count; j ++) {
            neighbour_position.set(hawk_displacement_buffer[j], hawk_displacement_buffer[j + 1], hawk_displacement_buffer[j + 2]); // actuall the hawk
            tmp_1.copy(neighbour_position).add(neg_loc); // hawk displacement
            l = tmp_1.length();
            if (l > 2) {
                continue;
            }
            avoid_hawks.addScaledVector(tmp_1, 1 / l);
        }
        if (avoid_hawks.length()) {
            avoid_hawks.normalize();
            avoid_hawks.multiplyScalar(-1);

            goal_steering_force.addScaledVector(avoid_hawks, HAWK_AVOIDANCE_WEIGHT);
            goal_steering_force.normalize();
        }

        // end avoid

        goal_steering_force.multiplyScalar(boid_force);
        goal_steering_force.multiplyScalar(dt / boid_mass);
        goal_steering_force.addScaledVector(gravity, dt);
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
        tmp_2.set(0.0, 0.0, 1.0);
        // tmp_2.normalize();
        v_tmp.add(tmp_2);
        v_tmp.normalize();
        currentO.setFromAxisAngle(v_tmp, Math.PI);
        orientations.setXYZW(i, currentO.x, currentO.y, currentO.z, currentO.w);

    }
    displacements.needsUpdate = true;
    velocities.needsUpdate = true;
    orientations.needsUpdate = true;

    /*
     * HAWKS
     */
    for (let i = 0, ul = hawk_displacements.count; i < ul; i++) {
        let index = i * 3;
        currentV.set(hawk_displacements.array[index], hawk_displacements.array[index + 1], hawk_displacements.array[index + 2]);
        currentVel.set(hawk_velocities.array[index], hawk_velocities.array[index + 1], hawk_velocities.array[index + 2]);

        neg_loc.copy(currentV);
        neg_loc.multiplyScalar(-1);

        neg_vel.copy(currentVel);
        neg_vel.multiplyScalar(-1);

        // tmp_1 will be the target; make tmp_1 the centroid of the nearby boids
        tmp_1.set(0, 0, 0);
        //tmp_2.copy(currentVel).normalize();
        lo.copy(currentV);
        //lo.addScaledVector(tmp_2, 2.5);
        lo.addScaledVector(hawk_search_vector, -1);
        hi.copy(currentV);
        //lo.addScaledVector(tmp_2, hawk_max_velocity);
        hi.add(hawk_search_vector);
        // console.log(lo, hi);

        neighbours = Array.from(tree.values(
            interleave_from_vector(lo.x, lo.y, lo.z),
            interleave_from_vector(hi.x, hi.y, hi.z)
        ));
        if (neighbours.length) {
            for (let j = 0, nl = neighbours.length, ni; j < nl; j++) {
                ni = neighbours[j] * 3;
                neighbour_position.set(displacement_buffer[ni], displacement_buffer[ni + 1], displacement_buffer[ni + 2]);
                neighbour_velocity.set(displacement_buffer[ni], displacement_buffer[ni + 1], displacement_buffer[ni + 2])
                tmp_2.copy(neg_loc).add(neighbour_position); // neighbour displacement
                tmp_1.add(tmp_2);
            }
        }
        separation.set(0, 0, 0);
        for (let j = 0, nl = hawk_displacements.count, ni; j < nl; j++) {
            if (i == j) continue;
            ni = j * 3;
            neighbour_position.set(hawk_displacement_buffer[ni], hawk_displacement_buffer[ni + 1], hawk_displacement_buffer[ni + 2]);
            tmp_1.copy(neg_loc).add(neighbour_position);
            separation.add(tmp_2);
        }
        separation.multiplyScalar(-1);
        separation.normalize();

        goal_steering_force.copy(tmp_1);
        goal_steering_force.add(neg_loc);
        goal_steering_force.normalize();
        goal_steering_force.multiplyScalar(max_velocity);
        goal_steering_force.add(neg_vel);
        goal_steering_force.normalize();
        // end neighbour calculations
        
        goal_steering_force.addScaledVector(separation, 0.9);
        goal_steering_force.normalize();

        goal_steering_force.multiplyScalar(hawk_force);
        goal_steering_force.multiplyScalar(dt / hawk_mass);
        goal_steering_force.addScaledVector(gravity, dt);
        //console.log(goal_steering_force);

        currentVel.add(goal_steering_force);
        currentVel.clampLength(0, hawk_max_velocity);
        v_tmp.copy(currentVel);
        v_tmp.multiplyScalar(dt);
        currentV.add(v_tmp);

        hawk_displacements.setXYZ(i, currentV.x, currentV.y, currentV.z);
        hawk_velocities.setXYZ(i, currentVel.x, currentVel.y, currentVel.z);
        //currentO.set(orientations.array[index], orientations.array[index + 1], orientations.array[index + 2]);
        v_tmp.copy(currentVel);
        v_tmp.normalize();
        tmp_2.set(0.0, 0.0, 1.0);
        //tmp_2.normalize();
        v_tmp.add(tmp_2);
        v_tmp.normalize();
        currentO.setFromAxisAngle(v_tmp, Math.PI);
        hawk_orientations.setXYZW(i, currentO.x, currentO.y, currentO.z, currentO.w);

    }
    hawk_displacements.needsUpdate = true;
    hawk_velocities.needsUpdate = true;
    hawk_orientations.needsUpdate = true;

    tree = new BTMap();
    for (let i = 0, j = 0, k = 0, ul = displacements.count; i < ul; i++) {
        j = i * 3;
        k = interleave_from_vector(displacement_buffer[j], displacement_buffer[j + 1], displacement_buffer[j + 2]);
        tree = tree.set(k, i);
    }
}

requestAnimationFrame(animate);
