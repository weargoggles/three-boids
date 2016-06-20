precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform vec3 light;

attribute vec3 position;
attribute vec3 displacement;
attribute vec3 normal;
attribute vec4 orientation;

varying vec3 vPosition;
varying vec3 v_ecNormal;

vec3 qtransform( vec4 q, vec3 v ){
	return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
}

void main(){
//    vPosition = position;
//    vec3 vcV = cross(orientation.xyz, vPosition);
//    vPosition = vcV * (2.0 * orientation.w) + (cross(orientation.xyz, vcV) * 2.0 + vPosition);
    vPosition = qtransform(orientation, position);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacement + vPosition, 1.0 );

    // TODO: what is normal matrix?
    vec3 qNormal = cross(orientation.xyz, normal);
    vec3 transformedNormal = qNormal * (2.0 * orientation.w) + (cross(orientation.xyz, qNormal) * 2.0 + normal);
    v_ecNormal = normalMatrix * transformedNormal;
}
