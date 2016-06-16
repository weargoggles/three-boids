precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;
attribute vec3 displacement;

varying vec3 vPosition;

void main(){
    vPosition = position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacement + vPosition, 1.0 );
}