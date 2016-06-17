precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform vec3 light;

attribute vec3 position;
attribute vec3 displacement;
attribute vec3 normal;

varying vec3 vPosition;
varying vec3 v_ecNormal;

void main(){
    vPosition = position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacement + vPosition, 1.0 );

    // TODO: what is normal matrix?
    vec3 transformedNormal = normalMatrix * normal;
    v_ecNormal = transformedNormal;
}
